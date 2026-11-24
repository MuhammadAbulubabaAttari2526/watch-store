drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
revoke insert on public.newsletter_subscribers from anon;
