# LM2Notepad
Notepad application for La-Mulana 2.

Take screenshots, write notes and create maps while playing the game.

### [Mapping tool Web demo](https://aamojl.github.io/LM2Notepad/demo/map.html)

Made with:
- [Electron](https://electronjs.org/) : Framework
- [Konva](https://konvajs.org/) : Map canvas
- [Tesseract.js](https://github.com/naptha/tesseract.js) : Text scanning
- [Bootstrap](https://getbootstrap.com/) : Visual styling

## Note tool

:warning: La Mulana 2 window needs to be visible and selected from the captured window list before you can take screenshots.

![image](https://github.com/user-attachments/assets/62ad1c02-b4ab-4181-9fe8-1f27fd4b7575)

| Feature | Description |
|-|-|
| Screenshot scanner (Experimental) | Add a screenshot and scan the text |
| Add a note | Add a new note |
| Add a screenshot | Add a screenshot to notes. Borders will be removed from the screenshot, if the `crop toggle` has been turned on |
| Edit note | Change the note text |

## Mapping tool

:warning: La Mulana 2 window needs to be visible and selected from the captured window list before you can take screenshots.

![image](https://github.com/user-attachments/assets/6ef193c7-7fe0-4c61-a7e6-8c98edb75999)

| Feature | Description |
|-|-|
| Screenshots | Drag and drop screenshots to the map grid. `Right click` to delete a screenshot |
| Map markers | Drag and drop icons and text to the map. |
| Maps | Add and select maps. `Right click` to delete a map |
| Map canvas | Drag elements to create a map. `Right click` to delete elements. Zoom and move the map with `mouse wheel` |
