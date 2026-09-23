# Password reset email setup

The password reset endpoints support Brevo or Resend over HTTPS. If you do not own a domain, use Brevo and verify one Gmail sender address.

```env
BREVO_API_KEY=xkeysib-your_key
MAIL_FROM_EMAIL=yourverifiedgmail@gmail.com
MAIL_FROM_NAME=Sono
```

## Production setup

1. Create a Brevo account and an API key.
2. Add your Gmail address under **Senders & IP → Senders**.
3. Complete the verification email Brevo sends to that Gmail address.
4. Add `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, and `MAIL_FROM_NAME` to Railway.
5. Deploy the staged changes.

The reset code is six digits, stored only as a SHA-256 hash, expires after 15 minutes, and is deleted after successful use. Only Gmail addresses are accepted.

Inbox placement cannot be guaranteed by application code. A verified sender and good sender reputation improve delivery. Brevo may still place messages in spam depending on the recipient provider.
