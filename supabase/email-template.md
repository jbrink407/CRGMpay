# Sign-in email (code only, no magic link)

Supabase’s default mail is a **Log in** button. Tapping it on a phone opens Safari (or Chrome), not the Home Screen CR Pay icon — those two do not share a login.

CR Pay signs in with the **code** typed in the app (6 or 8 digits, from Authentication → Settings → OTP length). Change the templates below so the email shows that code and does not include a login link.

## Confirm email (important)

**Authentication → Providers → Email**

- Email stays **enabled**
- Turn **Confirm email** **off**

If confirm-email stays on, the first sign-in often sends only a confirmation **link**, not a code.

## Magic Link template

**Authentication → Email Templates → Magic link**

**Subject**

```
CR Pay code {{ .Token }}
```

**Body** (replace the whole default HTML):

```html
<h2>Your CR Pay sign-in code</h2>
<p>
  Enter this code in the CR Pay app. Stay on that screen — do not tap a login
  link. A link opens a separate browser that is not your Home Screen shortcut.
</p>
<p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700">
  {{ .Token }}
</p>
<p>If you did not ask to sign in, you can ignore this email.</p>
```

Do **not** include `{{ .ConfirmationURL }}`.

## Confirm signup template (if you left Confirm email on)

Use the same subject and body as above so new accounts still get a code instead of a link.
