We need to do a comprehensive code clean up so that Gilbert can scale to more lines of code and more complex code on the front end and the backend.

This is a detailed walk through of the code with a list of required changes.

Starting in the App.tsx file:
1. AlertSettings type belongs in an AlertSettings.types.ts file for reuse
2. Move WeatherAlertSettingsModal into a new file in a new directory inside components called "Weather"




Claude's Assessment:
goes here...