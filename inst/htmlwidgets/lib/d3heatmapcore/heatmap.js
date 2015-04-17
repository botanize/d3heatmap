function heatmap(selector, data, opts) {
  var el = d3.select(selector);

  // Set option defaults
  opts = opts || {};
  opts.width = opts.width || 800;
  opts.height = opts.height || 500;
  opts.xclust_height = opts.xclust_height || opts.height * 0.12;
  opts.yclust_width = opts.yclust_width || opts.width * 0.12;
  opts.xaxis_height = opts.xaxis_height || 120;
  opts.yaxis_width = opts.yaxis_width || 120;
  opts.axis_padding = 3;

  if (!data.rows) {
    opts.yclust_width = 0;
  }
  if (!data.cols) {
    opts.xclust_height = 0;
  }

  var colormapBounds = {
    position: "absolute",
    left: opts.yclust_width,
    top: opts.xclust_height,
    width: opts.width - opts.yclust_width - opts.yaxis_width,
    height: opts.height - opts.xclust_height - opts.xaxis_height
  };
  var colDendBounds = {
    position: "absolute",
    left: colormapBounds.left,
    top: 0,
    width: colormapBounds.width,
    height: opts.xclust_height
  };
  var rowDendBounds = {
    position: "absolute",
    left: 0,
    top: colormapBounds.top,
    width: opts.yclust_width,
    height: colormapBounds.height
  };
  var yaxisBounds = {
    position: "absolute",
    top: colormapBounds.top,
    left: colormapBounds.left + colormapBounds.width,
    width: opts.yaxis_width,
    height: colormapBounds.height
  };
  var xaxisBounds = {
    position: "absolute",
    top: colormapBounds.top + colormapBounds.height,
    left: colormapBounds.left,
    width: colormapBounds.width,
    height: opts.xaxis_height
  };
  
  // Create DOM structure
  (function() {
    var inner = el.append("div").classed("inner", true);
    var info = inner.append("div").classed("info", true);
    var colDend = inner.append("svg").classed("dendrogram colDend", true).style(colDendBounds);
    var rowDend = inner.append("svg").classed("dendrogram rowDend", true).style(rowDendBounds);
    var colmap = inner.append("svg").classed("colormap", true).style(colormapBounds);
    var xaxis = inner.append("svg").classed("axis xaxis", true).style(xaxisBounds);
    var yaxis = inner.append("svg").classed("axis yaxis", true).style(yaxisBounds);
  })();
  
  var xZoomBehavior = d3.behavior.zoom().scaleExtent([1, Infinity]);
  var yZoomBehavior = d3.behavior.zoom().scaleExtent([1, Infinity]);
  var colormapZooms = [
    d3.behavior.zoom().scaleExtent([1, Infinity]),
    d3.behavior.zoom().scaleExtent([1, Infinity])
  ];

  el.select('.colDend').call(xZoomBehavior);
  el.select('.rowDend').call(yZoomBehavior);
  
  var row = !data.rows ? null : dendrogram(el.select('svg.rowDend'), data.rows, false, rowDendBounds.width, rowDendBounds.height, opts.axis_padding, yZoomBehavior);
  var col = !data.cols ? null : dendrogram(el.select('svg.colDend'), data.cols, true, colDendBounds.width, colDendBounds.height, opts.axis_padding, xZoomBehavior);
  var colormap = colormap(el.select('svg.colormap'), data.matrix, colormapBounds.width, colormapBounds.height, colormapZooms);
  var xax = axisLabels(el.select('svg.xaxis'), data.cols || data.matrix.cols, true, xaxisBounds.width, xaxisBounds.height, opts.axis_padding, xZoomBehavior);
  var yax = axisLabels(el.select('svg.yaxis'), data.rows || data.matrix.rows, false, yaxisBounds.width, yaxisBounds.height, opts.axis_padding, yZoomBehavior);
  
  function updateColormapZoom() {
    var xZoom = colormapZooms[0];
    var yZoom = colormapZooms[1];
    xZoom.scale(xZoomBehavior.scale());
    yZoom.scale(yZoomBehavior.scale());
    xZoom.translate(xZoomBehavior.translate());
    yZoom.translate(yZoomBehavior.translate());
    colormap.draw();
  }
  
  xZoomBehavior.on('zoom', function() {
    if (col) {
      col.draw();
    }
    updateColormapZoom();
  });
  yZoomBehavior.on('zoom', function() {
    if (row) {
      row.draw();
    }
    updateColormapZoom();
  });
  
  function colormap(svg, data, width, height, zoomBehaviors) {
    // Check for no data
    if (data.length === 0)
      return function() {};
    
    var cols = data.dim[1]
    var rows = data.dim[0];
    
    var merged = data.data;
    
    var x = d3.scale.linear().domain([0, cols]).range([0, width]);
    var y = d3.scale.linear().domain([0, rows]).range([0, height]);
    var color = d3.scale.linear()
        .domain(data.domain)
        .range(data.colors);
    
    zoomBehaviors[0].x(x);
    zoomBehaviors[1].y(y);
    
    svg = svg
        .attr("width", width)
        .attr("height", height)
      .append("g");
    var rect = svg.selectAll("rect").data(merged);
    rect.enter().append("rect").classed("datapt", true)
        .on("click", on_datapt_click)
        .on("mouseenter", on_datapt_mouseenter)
        .on("mouseleave", on_datapt_mouseleave);
    rect.exit().remove();
    rect
        .property("colIndex", function(d, i) { return i % cols; })
        .property("rowIndex", function(d, i) { return Math.floor(i / cols); })
        .attr("x", function(d, i) {
          return x(i % cols);
        })
        .attr("y", function(d, i) {
          return y(Math.floor(i / cols));
        })
        .attr("width", x(1))
        .attr("height", y(1))
        .attr("fill", function(d) { return color(d); });
    rect.append("title").text(function(d) { return d + ""; });
    
    function draw() {
      var t = [zoomBehaviors[0].translate()[0], zoomBehaviors[1].translate()[1]];
      var s = [zoomBehaviors[0].scale(), zoomBehaviors[1].scale()];
      svg.attr("transform", "translate(" + t[0] + " " + t[1] + ") " + "scale(" + s[0] + " " + s[1] + ")");
    }
    draw();
    
    return {
      draw: draw
    };
  }

  function axisLabels(svg, data, rotated, width, height, padding) {
    var leaves;
    if (data.children) {
      leaves = d3.layout.cluster().nodes(data)
          .filter(function(x) { return !x.children; })
          .map(function(x) { return x.name + ""; });
    } else if (data.length) {
      leaves = data;
    }
    
    var scale = d3.scale.ordinal()
        .domain(leaves)
        .rangeBands([0, rotated ? width : height]);
    var axis = d3.svg.axis()
        .scale(scale)
        .orient(rotated ? "bottom" : "right")
        .outerTickSize(0)
        .tickPadding(padding)
        .tickValues(leaves);

    var g = svg.append("g")
        .attr("transform", rotated ? "translate(0," + padding + ")" : "translate(" + padding + ",0)")
        .call(axis);
  }
  
  function dendrogram(svg, data, rotated, width, height, padding, zoomBehavior) {
    var x = d3.scale.linear();
    var y = d3.scale.linear()
        .domain([0, height])
        .range([0, height]);
    
    var cluster = d3.layout.cluster()
        .separation(function(a, b) { return 1; })
        .size([rotated ? width : height, (rotated ? height : width) - padding]);
    
    var transform = "";
    if (rotated) {
      // Flip dendrogram vertically
      x.range([1, 0]);
      // Rotate
      transform = "rotate(-90," + height/2 + "," + height/2 + ") translate(" + (height-1) + ", 0)";
    }
    
    if (rotated)
      zoomBehavior.x(y);
    else
      zoomBehavior.y(y);
    
    svg = svg
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", transform);
    
    var nodes = cluster.nodes(data),
        links = cluster.links(nodes);
    
    function draw() {
      // Constrain translation to extent
      if (d3.event) {
        var t = d3.event.translate;
        var s = d3.event.scale;
        if (rotated)
          t[0] = Math.max(-width * (s - 1), Math.min(0, t[0]));
        else
          t[1] = Math.max(-height * (s - 1), Math.min(0, t[1]));
        zoomBehavior.translate(t);
      }
      
      function elbow(d, i) {
        return x(d.source.y) + "," + y(d.source.x) + " " +
            x(d.source.y) + "," + y(d.target.x) + " " +
            x(d.target.y) + "," + y(d.target.x);
      }
      
      var link = svg.selectAll(".link")
          .data(links)
          .attr("points", elbow)
        .enter().append("polyline")
          .attr("class", "link")
          .attr("points", elbow);
      
      /*
      var node = svg.selectAll(".node")
          .data(nodes)
          .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; })
        .enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) { return "translate(" + x(d.y) + "," + y(d.x) + ")"; });
      
      var anchor = rotated ? "end" : "start";
      var dx = rotated ? -3 : 3;
      var leafNode = node.filter(function(d, i){ return !d.children; })
        .append("text")
          .attr("dx", dx)
          .attr("dy", 3)
          .attr("index", function(d, i) { return i; })
          .style("text-anchor", anchor)
          .text(function(d) { return d.name; })

      if (rotated) {
          leafNode
              .on("mouseenter", on_col_label_mouseenter)
              .on("mouseleave", on_col_label_mouseleave);
      } else {
          leafNode
              .on("mouseenter", on_row_label_mouseenter)
              .on("mouseleave", on_row_label_mouseleave);
      }
      
      return leafNode;
      */
    }
    draw();
    return {
      draw: draw,
      nodes: nodes
    };
  }

  function highlightPoints(row, col) {
    var hasRow = typeof(row) === 'number';
    var hasCol = typeof(col) === 'number';
    el.selectAll('.datapt').classed('highlight', function(d, i) {
      return (this.rowIndex === row) || (this.colIndex === col);
    });
    el.classed('heatmap-hover', hasRow || hasCol);
  }
  
  var dispatcher = d3.dispatch('hover', 'click');
  
  function on_datapt_mouseenter(e) {
    el.select('.info').text(d3.select(this).select('title').text());
    d3.select(row.leaves[this.rowIndex]).classed('active', true);
    d3.select(col.leaves[this.colIndex]).classed('active', true);
    dispatcher.hover({
      data: {
        value: +d3.select(this).select('title').text(),
        row: this.rowIndex,
        col: this.colIndex
      }
    });
  }
  function on_datapt_click(e) {
    el.select('.info').text(d3.select(this).select('title').text());
    d3.selectAll('.datapt.clicked').classed('clicked', false);
    d3.select(row.leaves[this.rowIndex]).classed('clicked', true);
    d3.select(this).classed('clicked', true);
    dispatcher.click({
      data: {
        value: +d3.select(this).select('title').text(),
        row: this.rowIndex,
        col: this.colIndex
      }
    });
  }
  function on_datapt_mouseleave(e) {
    el.select('.info').text('');
    d3.select(row.leaves[this.rowIndex]).classed('active', false);
    d3.select(col.leaves[this.colIndex]).classed('active', false);
  }
  function on_col_label_mouseenter(e) {
    var col = +d3.select(this).attr("index");
    highlightPoints(null, col);
  }
  function on_col_label_mouseleave(e) {
    highlightPoints(null, null);
  }
  function on_row_label_mouseenter(e) {
    var row = +d3.select(this).attr("index");
    highlightPoints(row, null);
  }
  function on_row_label_mouseleave(e) {
    highlightPoints(null, null);
  }
  el.select('.colormap').on("mouseover", function() {
    el.classed('highlighting', true);
  });
  el.select('.colormap').on("mouseleave", function() {
    el.classed('highlighting', false);
  });
  
  return {
    on: function(type, listener) {
      dispatcher.on(type, listener);
      return this;
    }
  };
}
