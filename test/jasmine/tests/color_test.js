var Color = require('../../../src/components/color');


describe('Test color:', function() {
    'use strict';

    describe('fill', function() {
        it('should call style with both fill and fill-opacity', function() {
            var mockElement = {
                style: function(object) {
                    expect(object.fill).toBe('rgb(255, 255, 0)');
                    expect(object['fill-opacity']).toBe(0.5);
                }
            };

            Color.fill(mockElement, 'rgba(255,255,0,0.5)');
        });
    });

    describe('stroke', function() {
        it('should call style with both fill and fill-opacity', function() {
            var mockElement = {
                style: function(object) {
                    expect(object.stroke).toBe('rgb(255, 255, 0)');
                    expect(object['stroke-opacity']).toBe(0.5);
                }
            };

            Color.stroke(mockElement, 'rgba(255,255,0,0.5)');
        });
    });

    describe('contrast', function() {
        it('should darken light colors', function() {
            var out = Color.contrast('#eee', 10, 20);

            expect(out).toEqual('rgb(190, 190, 190)');
        });

        it('should darken light colors (2)', function() {
            var out = Color.contrast('#fdae61', 10, 20);

            expect(out).toEqual('rgb(252, 139, 28)');
        });

        it('should lighten dark colors', function() {
            var out = Color.contrast('#2b83ba', 10, 20);

            expect(out).toEqual('rgb(47, 144, 205)');
        });
    });
});
