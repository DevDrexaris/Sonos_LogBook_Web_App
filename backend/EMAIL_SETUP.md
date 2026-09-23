# Email verification setup

Password reset supports Brevo or Resend over HTTPS. New form-based signup uses Brevo verification codes. If you do not own a domain, use Brevo and verify one Gmail sender address.

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
5. Run `database/migrations/add-signup-verification-security.sql` against the production database.
6. Deploy the staged changes.

Signup and reset codes are six digits, stored only as SHA-256 hashes, expire after 15 minutes, and are deleted after successful use. Signup accounts are not inserted into `users` until the code is verified. Only Gmail addresses are accepted.

Signup is rate limited by IP and email. Verification is limited to five attempts per pending signup and ten attempts per IP per hour. These controls use the `api_rate_limits` table and require the migration above.

Inbox placement cannot be guaranteed by application code. A verified sender and good sender reputation improve delivery. Brevo may still place messages in spam depending on the recipient provider.
