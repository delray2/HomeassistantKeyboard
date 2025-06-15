# Home Assistant On-Screen Keyboard Card

A custom Home Assistant Lovelace card that provides a smooth, animated on-screen keyboard for touchscreen dashboards. The keyboard automatically appears when input fields are focused and slides away when they lose focus.

## Features

- Smooth slide-up/slide-down animations
- Automatically detects input field focus
- Customizable keyboard layout (QWERTY, AZERTY, QWERTZ)
- Responsive design for all screen sizes
- Light and dark theme support

## Installation (via HACS)

1. Go to **HACS > Frontend > Custom repositories**
2. Add this repository: `https://github.com/delray2/HomeassistantKeyboard` as a **Template**
3. Search for "On-Screen Keyboard Card" in HACS Frontend and install
4. In Home Assistant, add the following to your `configuration.yaml` or use the UI to add a resource:

   ```yaml
   url: /local/onscreen-keyboard.js
   type: module
   ```
   (If you installed via HACS, this is usually handled automatically.)

5. Refresh your browser (Ctrl+F5)

## Usage

Add the custom card to your Lovelace dashboard (in raw config editor or UI):

```yaml
- type: custom:onscreen-keyboard
```

The keyboard will automatically appear when you focus on any input field in your dashboard and slide away when you click outside or press Enter.

## Configuration Options

- `theme`: `light` or `dark` (default: `light`)
- `animation_speed`: Animation speed in ms (default: `300`)
- `keyboard_layout`: `qwerty`, `azerty`, or `qwertz` (default: `qwerty`)

Example:
```yaml
- type: custom:onscreen-keyboard
  theme: dark
  animation_speed: 200
  keyboard_layout: azerty
```

## Support

Open an issue on GitHub for bugs or feature requests. 