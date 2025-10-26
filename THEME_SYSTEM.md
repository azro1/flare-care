# Theme System Documentation

## Overview
This application uses CSS custom properties (CSS variables) for a scalable theme system. All theme colors are defined in one place and automatically apply across the entire application.

## How It Works

### 1. CSS Variables Definition
All theme colors are defined in `src/app/globals.css`:

```css
:root {
  /* Light theme colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-card: rgba(255, 255, 255, 0.8);
  --text-primary: #1e293b;
  --text-secondary: #475569;
  /* ... more variables */
}

.dark {
  /* Dark theme colors */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: rgba(30, 41, 59, 0.6);
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  /* ... more variables */
}
```

### 2. Component Classes
Pre-built component classes use these variables:

- `.card` - Standard card styling
- `.card-mobile` - Mobile-optimized card styling
- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.input-field` - Form input styling
- `.nav-link-active` - Active navigation link
- `.nav-link-inactive` - Inactive navigation link

### 3. Utility Classes
Quick utility classes for common styling:

- `.text-primary` - Primary text color
- `.text-secondary` - Secondary text color
- `.text-tertiary` - Tertiary text color
- `.bg-card` - Card background
- `.bg-card-hover` - Card hover background
- `.border-theme` - Theme-aware border

## Usage Examples

### Using Component Classes
```jsx
// This automatically adapts to light/dark theme
<div className="card">
  <h3 className="text-primary">Title</h3>
  <p className="text-secondary">Description</p>
</div>
```

### Using Utility Classes
```jsx
// Custom styling with theme variables
<div className="bg-card border-theme rounded-xl p-6">
  <h2 className="text-primary">Custom Card</h2>
  <p className="text-secondary">This uses theme colors</p>
</div>
```

### Using CSS Variables Directly
```jsx
// For custom components
<div style={{
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  borderColor: 'var(--border-primary)'
}}>
  Custom styled element
</div>
```

## Changing Theme Colors

To change any color across the entire application, simply update the CSS variable in `src/app/globals.css`:

```css
:root {
  --bg-primary: #your-new-color; /* Changes everywhere this is used */
}
```

## Benefits

1. **Single Source of Truth**: All colors defined in one place
2. **Automatic Theme Switching**: Components automatically adapt
3. **Easy Maintenance**: Change one variable, update everywhere
4. **Consistent Design**: Ensures color consistency across the app
5. **Performance**: CSS variables are efficient and fast

## Theme Toggle

The theme toggle automatically switches between light and dark modes by adding/removing the `dark` class on the document root, which switches all CSS variable values instantly.
