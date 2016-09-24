#About

cato.js is a dependency free library for (image) comparison sliders.
Keep in mind that this software is in a very early stage.
Currently Webkit only.


#How To

###Download the Files from dest/

###Include CSS and JS File

Place the following lines in your HTML head.

```html
<link rel="stylesheet" href="your_path_to/cato.min.css">
<script src="your_path_to/cato.min.js"></script>
```

###Add the slider markup
... to your HTML

```html
<div id="your_id" class="cato">
  <img src="slideable_picture">
  <img src="visible_picture">
  <input type="range">
  <output></output>
  <span></span>
</div>
```

###Add javascript

Either in your HTML or in a seperate JS file.

```javascript
var options = { // are optional
      'tooltips': true, // boolean
      'direction': 'horizontal', // string horizontal & vertical
      'width': 700, // integer default = 700px
      'height': 450, // integer default = 450px
      'initial': 30, // integer default = 30 % (initial position for slider in px)
      'filter': {
        'active': true, // boolean
        'effect': 'sepia(75%)' /* url, blur, brightness, contrast, drop-shadow, grayscale, hue-rotate, invert, opacity, saturate, sepia */
      }
    },
    slider = new Cato(options)

    slider.createSlider('your_id')
```

##ToDo

- [x] css reset for images
- [x] class asignment needs to be moved to js. user should only need to set an id on the container
- [x] need to deal with max-width esp. on img tag
- [x] fix max-width problem for vertical sliders too
- [x] remove necessity to pass initial range per hardcoded html properties
- [ ] tooltips need correct initial position as well
- [ ] DRY code

## Changelog

0.0.1 Initial Release