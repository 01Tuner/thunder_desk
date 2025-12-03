# SAR Currency Symbol Update

This patch updates the Saudi Riyal (SAR) currency symbol to use the official SVG symbol from SAMA (Saudi Arabian Monetary Authority).

## Files

- **Saudi_Riyal_Symbol-2.svg**: Official SAR currency symbol downloaded from SAMA
  - Location: `/apps/thunder_desk/thunder_desk/thunder_desk/public/images/Saudi_Riyal_Symbol-2.svg`
  - Web URL: `/assets/thunder_desk/images/Saudi_Riyal_Symbol-2.svg`

- **update_sar_currency_symbol.py**: Patch script to update the Currency doctype
  - Location: `/apps/thunder_desk/thunder_desk/patches/update_sar_currency_symbol.py`

## Automatic Installation

The patch will run automatically when the `thunder_desk` app is installed, thanks to the `after_install` hook in `hooks.py`.

## Manual Execution

If you need to run the patch manually (e.g., after reinstalling or updating), use:

```bash
# From the bench directory
bench --site erpbo.site execute thunder_desk.patches.update_sar_currency_symbol.execute
```

Or run the Python script directly:

```bash
# From the bench directory
python apps/thunder_desk/thunder_desk/patches/update_sar_currency_symbol.py
```

## What It Does

The patch updates the `symbol` field of the SAR currency in the Currency doctype with:

```html
<img src="/assets/thunder_desk/images/Saudi_Riyal_Symbol-2.svg" style="width:auto !important; height: 0.9em;">
```

This ensures that wherever SAR currency is displayed in the system, it will show the official Saudi Riyal symbol instead of just "SAR" text.

## Post-Installation Steps

After installing the app or running the patch, you need to copy the images to the assets directory:

```bash
# Copy images to assets
cp -r apps/thunder_desk/thunder_desk/thunder_desk/public/images sites/assets/thunder_desk/

# Or rebuild assets (may not always copy static files)
bench build --app thunder_desk
```

## Verification

After running the patch, you can verify it worked by:

1. Going to **Currency** list in ERPNext
2. Opening the **SAR** currency record
3. Checking that the **Symbol** field contains the HTML img tag
4. Viewing any report or document with SAR amounts to see the symbol displayed

## Notes

- The SVG symbol will scale automatically to match the text height (0.9em)
- The symbol is displayed inline with the currency amounts
- This works in reports, forms, and print formats
