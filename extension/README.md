# Frame Cursor Companion (development build)

1. Open Chrome's `chrome://extensions` (Edge: `edge://extensions`).
2. Enable Developer mode, choose **Load unpacked**, and select this `extension` folder.
3. Reload Frame at http://127.0.0.1:5173/ and the webpage you will record.
4. On the webpage, open the extension and click **Use this tab for recording**.
5. In Frame, enable **Use cursor companion extension** and start recording. Share that same browser tab.
6. Stop recording. Pointer movement becomes **Recorded cursor · extension** and zoom uses its coordinates. Set the zoom amount above Fit to see magnification.

This development version connects only to localhost/127.0.0.1 port 5173. Coordinates and clicks stay on the device and are saved with the project. Tracking starts only when Frame starts an enabled recording and stops with recording. The extension requests webpage access so it can observe pointer events on the selected page.

Limitations: top-level webpage content only; no browser chrome, desktop apps, cross-origin iframe tracking, navigation between pages, or recovery for old videos. Share the exact tab selected in the extension: the display-capture picker does not expose the selected tab's extension ID for automatic verification. CSS hides the webpage cursor during tracking; browser capture cursor suppression still depends on browser support. Test a short recording before a longer session.

Validation: PWA production build and extension JavaScript syntax checks pass. Automated extension loading failed in the installed Chrome test environment; live extension-to-recording verification is still required after loading unpacked.
