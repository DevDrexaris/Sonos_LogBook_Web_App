UPDATE users
SET profile_image = 'https://cdn.phototourl.com/free/2026-09-22-5a80ed76-cc8f-4016-abd2-1326314af37b.jpg'
WHERE profile_image IS NULL
   OR profile_image = ''
   OR profile_image LIKE '%SonoDefaultbald.jpg%';