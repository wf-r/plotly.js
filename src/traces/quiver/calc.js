'use strict';

var Lib = require('../../lib');
var Axes = require('../../plots/cartesian/axes');
var isNumeric = require('fast-isnumeric');
var BADNUM = require('../../constants/numerical').BADNUM;
var colorscaleCalc = require('../../components/colorscale/calc');

/**
 * Main calculation function for quiver trace
 * Creates calcdata with arrow path data for each vector
 */
module.exports = function calc(gd, trace) {
    // Map x/y through axes so category/date values become numeric calcdata
    var xa = trace._xA = Axes.getFromId(gd, trace.xaxis || 'x', 'x');
    var ya = trace._yA = Axes.getFromId(gd, trace.yaxis || 'y', 'y');

    var xVals = xa.makeCalcdata(trace, 'x');
    var yVals = ya.makeCalcdata(trace, 'y');

    var len = Math.min(xVals.length, yVals.length);
    trace._length = len;
    var cd = new Array(len);

    var normMin = Infinity;
    var normMax = -Infinity;
    var cMin = Infinity;
    var cMax = -Infinity;
    var markerColor = (trace.marker || {}).color;
    var hasMarkerColorArray = Lib.isArrayOrTypedArray(markerColor);

    var uArr = trace.u || [];
    var vArr = trace.v || [];

    // First pass: build calcdata and compute maxNorm (needed for 'scaled' sizemode)
    for(var i = 0; i < len; i++) {
        var cdi = cd[i] = { i: i };
        var xValid = isNumeric(xVals[i]);
        var yValid = isNumeric(yVals[i]);

        if(xValid && yValid) {
            cdi.x = xVals[i];
            cdi.y = yVals[i];
        } else {
            cdi.x = BADNUM;
            cdi.y = BADNUM;
        }

        var ui = uArr[i] || 0;
        var vi = vArr[i] || 0;
        var norm = Math.sqrt(ui * ui + vi * vi);

        if(isFinite(norm)) {
            if(norm > normMax) normMax = norm;
            if(norm < normMin) normMin = norm;
        }

        if(hasMarkerColorArray) {
            var ci = markerColor[i];
            if(isNumeric(ci)) {
                if(ci < cMin) cMin = ci;
                if(ci > cMax) cMax = ci;
            }
        }
    }

    // Store maxNorm for use by plot.js
    trace._maxNorm = normMax;

    // Compute arrow geometry for axis autorange.
    //
    // The v-component is drawn directly in data space, so each arrow's y-tip is
    // exact and we expand the y-axis here with the tip coordinates. The
    // u-component is stretched by scaleRatio = pxPerY / pxPerX in plot.js so
    // that arrows keep their on-screen angle, which makes an arrow's *horizontal
    // pixel extent* depend on the y-scale rather than the x-scale:
    //     |dx_px| = pxPerY * baseLen * |unitx|
    // We therefore expand the x-axis with pixel padding (ppad) rather than
    // data-space tips (whose data width would depend on the very x-range we are
    // trying to compute). Since that ppad depends on the y-scale - which depends
    // on the combined y-extent of every quiver trace sharing the axis - the
    // x-axis expansion is finished in crossTraceCalc; here we stash the per-point
    // geometry and y-bounds it needs.
    var sizemode = trace.sizemode || 'scaled';
    var sizeref = (trace.sizeref !== undefined) ? trace.sizeref : (sizemode === 'raw' ? 1 : 0.5);
    var anchor = trace.anchor || 'tail';
    var isTip = anchor === 'tip';
    var isCenter = anchor === 'center';

    var baseX = new Array(len);
    var tipsY = new Array(len * 2);
    var geomLen = new Array(len);
    var geomUx = new Array(len);

    var yMin = Infinity;
    var yMax = -Infinity;

    for(var k = 0; k < len; k++) {
        var xk = xVals[k];
        var yk = yVals[k];
        var uk = uArr[k] || 0;
        var vk = vArr[k] || 0;
        var nk = Math.sqrt(uk * uk + vk * vk);

        var baseLen;
        if(sizemode === 'scaled') {
            baseLen = normMax ? (nk / normMax) * sizeref : 0;
        } else {
            baseLen = nk * sizeref;
        }

        var unitxk = nk ? (uk / nk) : 0;
        var unityk = nk ? (vk / nk) : 0;
        var dyk = unityk * baseLen;

        geomLen[k] = baseLen;
        geomUx[k] = unitxk;
        baseX[k] = xk;

        var y0, y1;
        if(isTip) {
            y1 = yk;
            y0 = yk - dyk;
        } else if(isCenter) {
            y0 = yk - dyk / 2;
            y1 = yk + dyk / 2;
        } else { // tail (default)
            y0 = yk;
            y1 = yk + dyk;
        }
        tipsY[k * 2] = y0;
        tipsY[k * 2 + 1] = y1;

        if(isNumeric(y0)) {
            if(y0 < yMin) yMin = y0;
            if(y0 > yMax) yMax = y0;
        }
        if(isNumeric(y1)) {
            if(y1 < yMin) yMin = y1;
            if(y1 > yMax) yMax = y1;
        }
    }

    xa._minDtick = 0;
    ya._minDtick = 0;

    // y-axis: arrow tips are exact in data space.
    trace._extremes[ya._id] = Axes.findExtremes(ya, tipsY, {padded: true});

    // x-axis: provisional bound from the base positions only; crossTraceCalc
    // replaces this with a ppad-based expansion once the combined y-scale across
    // all quiver traces on this axis is known.
    trace._extremes[xa._id] = Axes.findExtremes(xa, baseX, {padded: true});

    // Geometry needed to finish the x-axis expansion in crossTraceCalc.
    trace._quiver = {
        baseX: baseX,
        geomLen: geomLen,
        geomUx: geomUx,
        isTip: isTip,
        isCenter: isCenter,
        yMin: yMin,
        yMax: yMax
    };

    // Merge text arrays into calcdata for Drawing.textPointStyle
    Lib.mergeArray(trace.text, cd, 'tx');
    Lib.mergeArray(trace.textposition, cd, 'tp');
    if(trace.textfont) {
        Lib.mergeArrayCastPositive(trace.textfont.size, cd, 'ts');
        Lib.mergeArray(trace.textfont.color, cd, 'tc');
        Lib.mergeArray(trace.textfont.family, cd, 'tf');
        Lib.mergeArray(trace.textfont.weight, cd, 'tw');
        Lib.mergeArray(trace.textfont.style, cd, 'ty');
        Lib.mergeArray(trace.textfont.variant, cd, 'tv');
    }

    // Colorscale cmin/cmax computation: prefer provided marker.color, else magnitude
    if(trace._hasColorscale) {
        var vals = hasMarkerColorArray ? [cMin, cMax] : [normMin, normMax];
        // Guard against all-invalid input (no finite values found), which would
        // otherwise leave the seeds at +/-Infinity and feed them into the
        // colorscale calc. Fall back to a neutral [0, 1] range.
        if(!isFinite(vals[0]) || !isFinite(vals[1])) vals = [0, 1];
        colorscaleCalc(gd, trace, {
            vals: vals,
            containerStr: 'marker',
            cLetter: 'c'
        });
    }

    return cd;
};
