// This code will adjust the page layout, watch the Viewer
// and load the charts when the model date is loaded

// At the index.html add a <script> for this new file.
// This should go inside the <head>:

$(document).ready(function () {
  $(document).on('DOMNodeInserted', function (e) {
    if ($(e.target).hasClass('orbit-gizmo')) {
      // here, viewer represents the variable defined at viewer initialization
      if (viewer === null || viewer === undefined) return;
      new Dashboard(viewer, [new BarChart('Workset'), new PieChart('Material'), new BarChart('Category'), new PieChart('Workset')]);
    }
  });
});

// Handles the Dashboard panels
class Dashboard {
  constructor(viewer, panels) {
    var _this = this;
    this._viewer = viewer;
    this._panels = panels;
    this.adjustLayout();
    this._viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, (viewer) => {
      _this.loadPanels();
    });
  }

  adjustLayout() {
    // this function may vary for layout to layout...
    // for learn forge tutorials, let's get the ROW and adjust the size of the
    // columns so it can fit the new dashboard column, also we added a smooth transition css class for a better user experience
    let dashdiv = document.getElementById('dashboard');
    if (!!dashdiv) {
      dashdiv.parentElement.removeChild(dashdiv);
    }
    var row = $('.row').children();
    $(row[0]).removeClass('col-sm-4').addClass('col-sm-2 transition-width');
    $(row[1]).removeClass('col-sm-8').addClass('col-sm-7 transition-width').after('<div class="col-sm-3 transition-width" id="dashboard"></div>');
  }

  loadPanels() {
    var _this = this;
    var data = new ModelData(this);
    data.init(function () {
      $('#dashboard').empty();
      _this._panels.forEach(function (panel) {
        // let's create a DIV with the Panel Function name and load it
        panel.load('dashboard', viewer, data);
      });
    });
  }
}
