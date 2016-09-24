// Compare Apples To Oranges

function Cato (options) {
  'use strict'
  var opts = options || {}

  this.options = {
    'tooltips': opts.tooltips || false,
    'direction': opts.direction || 'horizontal',
    'width': opts.width || 700,
    'height': opts.height || 450,
    'initial': opts.initial || 30,
    'filter': {
      'active': opts.filter_active || false,
      'effect': opts.filter_effect || false
    }
  }

  Cato.prototype.createSlider = function (id) {

    var container = document.getElementById(id),
        containerInner = container.children,
        imgToSlide = containerInner[0],
        imgBase = containerInner[1],
        range = containerInner[2],
        output = containerInner[3],
        outputTriangle = containerInner[4],
        self = this

    // INITIAL STYLINGS
    addClass(container, 'comparison')
    addClass(range, 'cato_inner')
    addClass(range, 'rangeindicator')
    addClass(output, 'indicator_bubble')
    addClass(outputTriangle, 'indicator_triangle')
    container.style.height = self.options.height + 50 + 'px'
    imgBase.style.width = self.options.width + 'px'
    imgBase.style.height = self.options.height + 'px'
    imgToSlide.style.width = self.options.width + 'px'
    imgToSlide.style.height = self.options.height + 'px'
    range.style.top = imgBase.getBoundingClientRect().height + 'px'
    range.style.width = imgBase.width + 'px'
    output.style.top = imgBase.getBoundingClientRect().height - 40 + 'px'
    outputTriangle.style.top = imgBase.getBoundingClientRect().height - 15 + 'px'
    range.value = self.options.initial

    // initial overlap
    if (isWebkit()) {
      var initialClip = (self.options.direction === 'horizontal') ? imgBase.width * self.options.initial / 100 : imgBase.height * self.options.initial / 100
      imgBase.style.webkitClipPath = setInsetDirection(self.options.direction, initialClip)
    } else {
      imgBase.style.clip = 'rect(0px, 30px, 450px, 0px)'
    }

    // flip input range and adjust to the side if vertical
    if (self.options.direction === 'vertical') {
      range.style.transform = 'rotate(90deg)'
      range.style.width = imgBase.getBoundingClientRect().height + 'px'
      range.style.left = imgBase.getBoundingClientRect().right - range.getBoundingClientRect().left + 7 + 'px'
      range.style.top = imgBase.getBoundingClientRect().height / 2 + 'px'
      range.style.margin = '-1px 3px 1px'
    }

    // Applying Filters if any
    if (self.options.filter.active) {
      if (isWebkit()) {
        imgToSlide.style.webkitFilter = self.options.filter.effect
      } else {
        imgToSlide.style.filter = self.options.filter.effect
      }
    }

    // EVENT REGISTRATIONS

    range.addEventListener('input', function () {
      handleSlides(self)
    })

    if (self.options.tooltips) {
      range.addEventListener('focus', function () {
        handleFocus()
      })

      range.addEventListener('blur', function () {
        handleBlur()
      })
    }

    // EVENT HANDLERS

    var handleSlides = function (self) {
      var width = imgBase.width,
          height = imgBase.getBoundingClientRect().height,
          slidedWith = (self.options.direction === 'horizontal') ? width * range.value / 100 : height * range.value / 100

      if (isWebkit()) {
        imgBase.style.webkitClipPath = setInsetDirection(self.options.direction, slidedWith)
      } else {
        imgBase.style.clip = 'rect(0px, ' + slidedWith + 'px, 450px, 0px)'
      }

      output.style.left = slidedWith + 'px'
      outputTriangle.style.left = slidedWith + 'px'

      if (self.options.direction === 'vertical') {
        output.style.left = imgBase.getBoundingClientRect().right - range.getBoundingClientRect().left - 45 + 'px'
        outputTriangle.style.left = imgBase.getBoundingClientRect().right - range.getBoundingClientRect().left - 22 + 'px'
        output.style.top = slidedWith - 10 + 'px'
        outputTriangle.style.top = slidedWith + 'px'
        outputTriangle.style.transform = 'rotate(-90deg)'
      }

      output.setAttribute('data-range', range.value.toString(10))

    }

    var handleFocus = function () {
      addClass(output, 'active')
      addClass(outputTriangle, 'active')
    }

    var handleBlur = function () {
      removeClass(output, 'active')
      removeClass(outputTriangle, 'active')
    }

  }

  // HELPERS

  var addClass = function (el, className) {
    // see youmightnotneedjquery.com
    if (el.classList) {
      el.classList.add(className)
    } else {
      el.className += ' ' + className
    }
  }

  var removeClass = function (el, className) {
    // see youmightnotneedjquery.com
    if (el.classList) {
      el.classList.remove(className)
    } else {
      el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ')
    }
  }

  var isWebkit = function () {
    var ua = window.navigator.userAgent.toLowerCase()
    if ((/webkit/).test(ua)) {
      return true
    }
  }

  var setInsetDirection = function (direction, val) {
    if (direction === 'horizontal') {
      return 'inset(0px 0px 0px ' + val + 'px)'
    } else if (direction === 'vertical') {
      return 'inset(' + val + 'px 0px 0px 0px)'
    } else {
      throw new Error('Direction must be either horizontal or vertical')
    }
  }

}
