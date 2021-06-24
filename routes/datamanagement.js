// routes for the Forge datamanagement API

/* The code receives the request from the UI tree. 
The id parameter indicates the node that is being expanded: # means root node, so list hubs. 
After that it contains the href of the resources therefore
when expanding one hub the endpoint should return the projects for the hub. 
*/

// for purposes of this test the cope will be in two parts (don't ask)
// Part 1

const express = require('express');
const { HubsApi, ProjectsApi, FoldersApi, ItemsApi } = require('forge-apis');

const { OAuth } = require('./common/oauth');

let router = express.Router();

router.get('/datamanagement', async (req, res) => {
  // The id querystring parameter contains what was selected on the UI tree, make sure it's valid
  const href = decodeURIComponent(req.query.id);
  if (href === '') {
    res.status(500).end();
    return;
  }

  // Get the access token
  const oauth = new OAuth(req.session);
  const internalToken = await oauth.getInternalToken();
  if (href === '#') {
    // If href is '#', it's the root tree node
    getHubs(oauth.getClient(), internalToken, res);
  } else {
    // Otherwise let's break it by '/'
    const params = href.split('/');
    const resourceName = params[params.length - 2];
    const resourceId = params[params.length - 1];
    switch (resourceName) {
      case 'hubs':
        getProjects(resourceId, oauth.getClient(), internalToken, res);
        break;
      case 'projects':
        // For a project, first we need the top/root folder
        const hubId = params[params.length - 3];
        getFolders(hubId, resourceId /*project_id*/, oauth.getClient(), internalToken, res);
        break;
      case 'folders': {
        const projectId = params[params.length - 3];
        getFolderContents(projectId, resourceId /*folder_id*/, oauth.getClient(), internalToken, res);
        break;
      }
      case 'items': {
        const projectId = params[params.length - 3];
        getVersions(projectId, resourceId /*item_id*/, oauth.getClient(), internalToken, res);
        break;
      }
    }
  }
});

// Part 2
/*
The last get function returns the Versions for each item (file), 
where the .relationships.derivatives.data.id property contains the URN for the Viewer. 
It's important to test if this attribute is available as some items may not have viewables 
(e.g. a ZIP or DOCx file) or may not have being translated yet.

Note how we reuse the auth helpers from routes/common/oauth.js here
*/
async function getHubs(oauthClient, credentials, res) {
  const hubs = new HubsApi();
  const data = await hubs.getHubs({}, oauthClient, credentials);
  res.json(
    data.body.data.map((hub) => {
      let hubType;
      switch (hub.attributes.extension.type) {
        case 'hubs:autodesk.core:Hub':
          hubType = 'hubs';
          break;
        case 'hubs:autodesk.a360:PersonalHub':
          hubType = 'personalHub';
          break;
        case 'hubs:autodesk.bim360:Account':
          hubType = 'bim360Hubs';
          break;
      }
      return createTreeNode(hub.links.self.href, hub.attributes.name, hubType, true);
    })
  );
}

async function getProjects(hubId, oauthClient, credentials, res) {
  const projects = new ProjectsApi();
  const data = await projects.getHubProjects(hubId, {}, oauthClient, credentials);
  res.json(
    data.body.data.map((project) => {
      let projectType = 'projects';
      switch (project.attributes.extension.type) {
        case 'projects:autodesk.core:Project':
          projectType = 'a360projects';
          break;
        case 'projects:autodesk.bim360:Project':
          projectType = 'bim360projects';
          break;
      }
      return createTreeNode(project.links.self.href, project.attributes.name, projectType, true);
    })
  );
}

async function getFolders(hubId, projectId, oauthClient, credentials, res) {
  const projects = new ProjectsApi();
  const folders = await projects.getProjectTopFolders(hubId, projectId, oauthClient, credentials);
  res.json(
    folders.body.data.map((item) => {
      return createTreeNode(item.links.self.href, item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName, item.type, true);
    })
  );
}

async function getFolderContents(projectId, folderId, oauthClient, credentials, res) {
  const folders = new FoldersApi();
  const contents = await folders.getFolderContents(projectId, folderId, {}, oauthClient, credentials);
  const treeNodes = contents.body.data.map((item) => {
    var name = item.attributes.name == null ? item.attributes.displayName : item.attributes.name;
    if (name !== '') {
      // BIM 360 Items with no displayName also don't have storage, so not file to transfer
      return createTreeNode(item.links.self.href, name, item.type, true);
    } else {
      return null;
    }
  });
  res.json(treeNodes.filter((node) => node !== null));
}

async function getVersions(projectId, itemId, oauthClient, credentials, res) {
  const items = new ItemsApi();
  const versions = await items.getItemVersions(projectId, itemId, {}, oauthClient, credentials);
  res.json(
    versions.body.data.map((version) => {
      const dateFormated = new Date(version.attributes.lastModifiedTime).toLocaleString();
      const versionst = version.id.match(/^(.*)\?version=(\d+)$/)[2];
      const viewerUrn = version.relationships != null && version.relationships.derivatives != null ? version.relationships.derivatives.data.id : null;
      return createTreeNode(viewerUrn, decodeURI('v' + versionst + ': ' + dateFormated + ' by ' + version.attributes.lastModifiedUserName), viewerUrn != null ? 'versions' : 'unsupported', false);
    })
  );
}

// Format data for tree
function createTreeNode(_id, _text, _type, _children) {
  return { id: _id, text: _text, type: _type, children: _children };
}

module.exports = router;
