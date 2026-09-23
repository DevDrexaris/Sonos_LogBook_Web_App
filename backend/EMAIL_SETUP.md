# Password reset email setup

The password reset endpoints use Resend over HTTPS. Configure these variables on the Railway PHP backend service:

```env
RESEND_API_KEY=re_your_resend_api_key
MAIL_FROM=Sono <no-reply@your-verified-domain.com>
```

## Production setup

1. Create a Resend account and an API key.
2. Add and verify a domain you control in Resend.
3. Publish the SPF and DKIM DNS records Resend provides.
4. Set `MAIL_FROM` to an address on that verified domain.
5. Add both variables to Railway and deploy the staged changes.

The reset code is six digits, stored only as a SHA-256 hash, expires after 15 minutes, and is deleted after successful use. Only Gmail addresses are accepted.

Inbox placement cannot be guaranteed by application code. A verified sender domain, SPF, DKIM, and a good sender reputation are required for reliable inbox delivery. Do not use `onboarding@resend.dev` for production users; it is intended for testing and has recipient restrictions.
