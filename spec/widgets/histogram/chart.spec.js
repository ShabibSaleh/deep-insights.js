var _ = require('underscore');
var $ = require('jquery');
var d3 = require('d3');
var WidgetHistogramChart = require('../../../src/widgets/histogram/chart');

describe('widgets/histogram/chart', function () {
  var onWindowResizeReal;
  var onWindowResizeSpy;

  afterEach(function () {
    $('.js-chart').remove();
  });

  beforeEach(function () {
    d3.select('body').append('svg').attr('class', 'js-chart');

    this.width = 300;
    this.height = 100;

    d3.select($('.js-chart')[0])
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('class', 'Canvas');

    this.data = genHistogramData(20);
    this.margin = {
      top: 4,
      right: 4,
      bottom: 4,
      left: 4
    };

    // override default behavior of debounce, to be able to control callback
    onWindowResizeSpy = jasmine.createSpy('_onWindowResize');
    spyOn(_, 'debounce').and.callFake(function (cb) {
      onWindowResizeReal = cb;
      return onWindowResizeSpy;
    });

    this.view = new WidgetHistogramChart(({
      el: $('.js-chart'),
      margin: this.margin,
      hasHandles: true,
      height: 100,
      data: this.data,
      displayShadowBars: true,
      xAxisTickFormat: function (d, i) {
        return d;
      }
    }));

    var parentSpy = jasmine.createSpyObj('view.$el.parent()', ['width']);
    parentSpy.width.and.returnValue(this.width);
    spyOn(this.view.$el, 'parent');
    this.view.$el.parent.and.returnValue(parentSpy);

    spyOn(this.view, 'refresh').and.callThrough();

    this.view.render();
  });

  it('should be hidden initially', function () {
    expect(this.view.$el.attr('style')).toMatch('none');
  });

  describe('when view is resized but set to not be shown just yet', function () {
    beforeEach(function () {
      expect(this.view.options.showOnWidthChange).toBe(true); // assert default value, in case it's changed
      this.view.options.showOnWidthChange = false;
    });

    it('should not show view', function () {
      expect(this.view.$el.attr('style')).toMatch('none');
    });
  });

  describe('when view is resized', function () {
    beforeEach(function () {
      onWindowResizeReal.call(this);
      expect(this.view.$el.parent).toHaveBeenCalled();
    });

    it('should render the view', function () {
      expect(this.view.$el.attr('style')).not.toMatch('none');
    });

    it('should calculate the width of the bars', function () {
      expect(this.view.barWidth).toBe((this.width - this.margin.left - this.margin.right) / this.data.length);
    });

    it('should draw the bars', function () {
      expect(this.view.$el.find('.CDB-Chart-bar').size()).toBe(this.data.length);
    });

    it('should draw the axis', function () {
      expect(this.view.$el.find('.CDB-Chart-axis').size()).toBe(1);
    });

    it('should draw the handles', function () {
      expect(this.view.$el.find('.CDB-Chart-handle').size()).toBe(2);
    });

    it('should hide the chart', function () {
      expect(this.view.$el.css('display')).toBe('inline');

      this.view.hide();

      expect(this.view.isHidden()).toBe(true);
      expect(this.view.model.get('display')).toBe(false);
      expect(this.view.$el.css('display')).toBe('none');
    });

    it('should show the chart', function () {
      this.view.hide();
      this.view.show();
      expect(this.view.$el.css('display')).toBe('inline');
    });

    it('should set the parent width', function () {
      this.view.show();
      this.view._resizeToParentElement();
      expect(this.view.model.get('width')).toBe(this.width);
    });

    it('should generate the shadow bars', function () {
      expect(this.view.$el.find('.CDB-Chart-shadowBars').length).toBe(1);
    });

    it('should hide the shadow bars', function () {
      this.view.removeShadowBars();
      expect(this.view.$el.find('.CDB-Chart-shadowBars').length).toBe(0);
    });

    it('should maintain the visibility after calling _resizeToParentElement', function () {
      this.view.show();
      this.view.$el.parent().width();
      this.view._resizeToParentElement();
      expect(this.view.$el.css('display')).toBe('inline');
      expect(this.view.model.get('display')).toBe(true);

      this.view.hide();
      this.view._resizeToParentElement();
      expect(this.view.$el.css('display')).toBe('none');
      expect(this.view.model.get('display')).toBe(false);
    });

    it('should calculate the scales', function () {
      var max = _.max(this.view.model.get('data'), function (d) { return d.freq; });

      expect(this.view.xScale(0)).toBe(0);
      expect(this.view.xScale(100)).toMatch(/\d+/);
      expect(this.view.xScale(100)).toEqual(this.view.chartWidth());

      expect(this.view.yScale(0)).toMatch(/\d+/);
      expect(this.view.yScale(0)).toEqual(this.view.chartHeight());
      expect(this.view.yScale(max.freq)).toBe(0);
    });

    it('should refresh the data', function () {
      this.view.show();
      this.view.model.set({ data: genHistogramData(20) });
      expect(this.view.refresh).toHaveBeenCalled();
    });

    describe('should allow to manage the y scale', function () {
      beforeEach(function () {
        this.originalScale = this.view.yScale;
        this.view.model.set('data', genHistogramData(10));
      });

      it('should calculate the y scale on request', function () {
        expect(this.view.yScale).toEqual(this.originalScale);

        this.view.updateYScale();
        expect(this.view.yScale).not.toEqual(this.originalScale);
      });

      it('should restore the y scale on request', function () {
        this.view.resetYScale();
        expect(this.view.yScale).toEqual(this.originalScale);
      });
    });
  });
});

function genHistogramData (n) {
  n = n || 1;
  var arr = [];
  _.times(n, function (i) {
    var start = (100 * i) + Math.round(Math.random() * 1000);
    var end = start + 100;
    var obj = {
      bin: i,
      freq: Math.round(Math.random() * 10),
      start: start,
      end: end,
      max: end,
      min: start
    };
    arr.push(obj);
  });
  return arr;
}
