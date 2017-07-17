$(function() {
  var element = $(".cover-image"),
      elementHeight = element.height(),
      steps = elementHeight / 10,
      startScroll = 0;

  $(window).on("scroll", function(a, b) {
    var self = $(this),
        scrollTop = self.scrollTop(),
        count = Math.abs(scrollTop - startScroll);

    if(scrollTop >= startScroll && count < elementHeight) {
      var blur = count / steps,
      scale = blur >= 0 ? 1 + (blur / 5) * .1 : 1

      $(".cover-image, #header h2").css({
        'filter'         : 'blur('+blur+'px)',
        '-webkit-filter' : 'blur('+blur+'px)',
        '-moz-filter'    : 'blur('+blur+'px)',
        '-o-filter'      : 'blur('+blur+'px)',
        '-ms-filter'     : 'blur('+blur+'px)'
      });

      element.css({
        '-webkit-transform' : 'scale('+ scale +')',
        '-moz-transform'    : 'scale('+ scale +')',
        '-ms-transform'     : 'scale('+ scale +')',
        '-o-transform'      : 'scale('+ scale +')',
        'transform'         : 'scale('+ scale +')'
      });
    }
  });
});
