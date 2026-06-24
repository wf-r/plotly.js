'use strict';

var Axes = require('../../plots/cartesian/axes');

/**
 * Finish quiver x-axis autorange.
 *
 * An arrow's horizontal pixel extent is `pxPerY * baseLen * |unitx|` (see
 * calc.js and plot.js), so it is governed by the y-scale, not the x-scale. The
 * y-scale in turn depends on the combined y-extent of every quiver trace sharing
 * the axis, which is only known here - after all per-trace calc() runs. We
 * estimate pxPerY from that combined extent and expand the x-axis with pixel
 * padding so the full arrows stay visible without a hard-coded range.
 *
 * Runs once per cartesian subplot (see Plots.doCrossTraceCalc).
 */
module.exports = function crossTraceCalc(gd, plotinfo) {
    var xa = plotinfo.xaxis;
    var ya = plotinfo.yaxis;
    var fullData = gd._fullData;

    var traces = [];
    var yMin = Infinity;
    var yMax = -Infinity;

    for(var i = 0; i < fullData.length; i++) {
        var trace = fullData[i];
        if(
            trace.visible === true &&
            trace.type === 'quiver' &&
            trace.xaxis === xa._id &&
            trace.yaxis === ya._id &&
            trace._quiver
        ) {
            traces.push(trace);
            var q = trace._quiver;
            if(q.yMin < yMin) yMin = q.yMin;
            if(q.yMax > yMax) yMax = q.yMax;
        }
    }

    if(!traces.length) return;

    // Estimate the final y-scale (pixels per y data unit). The y-axis only gets
    // the standard 5%-per-side autorange padding, so its span ends up ~ span/0.9;
    // a coincident set of points falls back to the autorange default span of 2.
    // Using the quiver-only y-extent is a safe estimate: any extra (e.g. from
    // other traces) can only widen the y-range, lowering pxPerY and leaving a
    // little extra room on x rather than clipping.
    ya.setScale();
    var yDataSpan = (yMax > yMin) ? (yMax - yMin) : 0;
    var yEstSpan = yDataSpan > 0 ? (yDataSpan / 0.9) : 2;
    var pxPerY = (ya._length && yEstSpan) ? (ya._length / yEstSpan) : 0;

    for(var t = 0; t < traces.length; t++) {
        var tr = traces[t];
        var q2 = tr._quiver;
        var baseX = q2.baseX;
        var geomLen = q2.geomLen;
        var geomUx = q2.geomUx;
        var len = baseX.length;

        var ppadplus = new Array(len);
        var ppadminus = new Array(len);

        for(var j = 0; j < len; j++) {
            var xPixExt = pxPerY * geomLen[j] * Math.abs(geomUx[j]);
            var plus = 0;
            var minus = 0;
            if(q2.isCenter) {
                plus = minus = xPixExt / 2;
            } else if(q2.isTip) {
                if(geomUx[j] >= 0) minus = xPixExt;
                else plus = xPixExt;
            } else { // tail
                if(geomUx[j] >= 0) plus = xPixExt;
                else minus = xPixExt;
            }
            ppadplus[j] = plus;
            ppadminus[j] = minus;
        }

        tr._extremes[xa._id] = Axes.findExtremes(xa, baseX, {
            padded: true,
            ppadplus: ppadplus,
            ppadminus: ppadminus
        });
    }
};
