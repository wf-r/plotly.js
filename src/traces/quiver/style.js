'use strict';

var d3 = require('@plotly/d3');
var Lib = require('../../lib');

var Drawing = require('../../components/drawing');
var Color = require('../../components/color');
var Colorscale = require('../../components/colorscale');
var DESELECTDIM = require('../../constants/interactions').DESELECTDIM;

// Stroke each arrow path according to the trace colorscale, using marker.color
// when it is an array of scalar values, otherwise falling back to the vector
// magnitude |(u, v)|. `paths` may be a multi-path selection or a single path.
function colorscaleStroke(paths, trace) {
    var marker = trace.marker || {};
    var colorFunc = Colorscale.makeColorScaleFuncFromTrace(marker);

    paths.style('stroke', function(cdi) {
        var markerColor = marker.color;
        var value;
        if(Lib.isArrayOrTypedArray(markerColor) && markerColor.length > cdi.i && isFinite(markerColor[cdi.i])) {
            value = markerColor[cdi.i];
        } else {
            var uVal = (trace.u && trace.u[cdi.i]) || 0;
            var vVal = (trace.v && trace.v[cdi.i]) || 0;
            value = Math.sqrt(uVal * uVal + vVal * vVal);
        }
        return colorFunc(value);
    });
}

function style(gd) {
    var s = d3.select(gd).selectAll('g.trace.quiver');

    s.each(function(d) {
        var trace = d[0].trace;
        var marker = trace.marker || {};
        var markerLine = marker.line || {};
        var lineColor = Lib.isArrayOrTypedArray(marker.color) ? undefined : marker.color;

        var paths = d3.select(this).selectAll('path.js-line');
        paths.call(Drawing.lineGroupStyle, markerLine.width, lineColor, markerLine.dash);

        // colorscale strokes must be applied after lineGroupStyle, which would
        // otherwise flatten every arrow to a single (line.color) stroke
        if(trace._hasColorscale) colorscaleStroke(paths, trace);
    });
}

function styleOnSelect(gd, cd, sel) {
    var trace = cd[0].trace;
    var marker = trace.marker || {};
    var markerLine = marker.line || {};
    var lineColor = Lib.isArrayOrTypedArray(marker.color) ? undefined : marker.color;
    var hasColorscale = trace._hasColorscale;

    if(!sel) return;

    if(trace.selectedpoints) {
        var selectedAttrs = trace.selected || {};
        var unselectedAttrs = trace.unselected || {};
        var selectedLine = selectedAttrs.line || {};
        var unselectedLine = unselectedAttrs.line || {};

        sel.selectAll('path.js-line').each(function(d) {
            var path = d3.select(this);

            if(d.selected) {
                var sw = selectedLine.width !== undefined ? selectedLine.width : markerLine.width;
                if(selectedLine.color) {
                    Drawing.lineGroupStyle(path, sw, selectedLine.color, markerLine.dash);
                } else if(hasColorscale) {
                    Drawing.lineGroupStyle(path, sw, lineColor, markerLine.dash);
                    colorscaleStroke(path, trace);
                    path.style('stroke-opacity', 1);
                } else {
                    Drawing.lineGroupStyle(path, sw, lineColor, markerLine.dash);
                }
            } else {
                var uc = unselectedLine.color;
                var uw = unselectedLine.width !== undefined ? unselectedLine.width : markerLine.width;
                if(uc) {
                    Drawing.lineGroupStyle(path, uw, uc, markerLine.dash);
                } else if(hasColorscale) {
                    // keep colorscale color but dim via opacity
                    Drawing.lineGroupStyle(path, uw, lineColor, markerLine.dash);
                    colorscaleStroke(path, trace);
                    path.style('stroke-opacity', DESELECTDIM);
                } else {
                    var dimColor = lineColor ? Color.addOpacity(lineColor, DESELECTDIM) : undefined;
                    Drawing.lineGroupStyle(path, uw, dimColor, markerLine.dash);
                }
            }
        });

        Drawing.selectedTextStyle(sel.selectAll('text'), trace);
    } else {
        var paths = sel.selectAll('path.js-line');
        paths.call(Drawing.lineGroupStyle, markerLine.width, lineColor, markerLine.dash);
        if(hasColorscale) colorscaleStroke(paths, trace);
        Drawing.textPointStyle(sel.selectAll('text'), trace, gd);
    }
}

module.exports = {
    style: style,
    styleOnSelect: styleOnSelect,
    colorscaleStroke: colorscaleStroke
};
