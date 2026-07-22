'use strict';

module.exports = function selectPoints(searchInfo, selectionTester) {
    var cd = searchInfo.cd;
    var selection = [];
    var fullData = cd[0].trace;

    var model = fullData._sankey;
    var nodes = model.graph.nodes;
    var vertical = fullData.orientation === 'v';
    var reverse = fullData.direction === 'reverse';

    for(var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if(node.partOfGroup) continue; // Those are invisible

        // Position of node's centroid in the layout frame
        var cx = (node.x0 + node.x1) / 2;
        var cy = (node.y0 + node.y1) / 2;

        // Mirror/swap to match the group transform applied in render.js (sankeyTransform):
        //   h + forward:  (cx, cy)
        //   h + reverse:  (width - cx, cy)     -> matrix(-1  0 0 1) + translate(width, 0)
        //   v + forward:  (cy, cx)             -> matrix( 0  1 1 0)  (swap x/y)
        //   v + reverse:  (cy, height - cx)    -> matrix( 0 -1 1 0) + translate(0, height)
        var pos;
        if(vertical) {
            pos = [cy, reverse ? model.height - cx : cx];
        } else {
            pos = [reverse ? model.width - cx : cx, cy];
        }

        if(selectionTester && selectionTester.contains(pos, false, i, searchInfo)) {
            selection.push({
                pointNumber: node.pointNumber
                // TODO: add eventData
            });
        }
    }
    return selection;
};
