# Boxer
A simple box model editor I made to help with layout planning.

## What it does
Draw boxes on a grid, nest them, and get the corresponding HTML/CSS structure. Built this mainly to help visualize layouts before coding them.

## Features
- Click & drag to create boxes
- Nest elements 
- Real-time JSON output
- Local saves
- CSS editor
- Undo/redo

## Box Types
```css
div   { background: lightblue; }  # Standard block
span  { background: tomato; }     # Inline element
flex  { background: lightgreen; } # Flexbox container
block { background: moccasin; }   # Block element
```

## Usage
1. Click and drag to create boxes
2. Use select mode to move/resize
3. CSS mode to customize styles
4. Local saves to keep your work

## Example Output
```json
{
 "elements": [{
   "type": "div",
   "name": "ab-div",
   "styles": {
     "position": "absolute",
     "left": "100px", 
     "top": "50px",
     "width": "200px",
     "height": "100px"
   }
 }]
}
```

Built with vanilla JS. Feel free to use/modify!
