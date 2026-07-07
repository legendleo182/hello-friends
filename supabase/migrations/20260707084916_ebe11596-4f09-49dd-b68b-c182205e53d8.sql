
alter function public.tg_touch_updated_at() set search_path=public;
alter function public.recalc_rent_status() set search_path=public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
revoke execute on function public.is_staff(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.generate_monthly_rent() from anon, authenticated;
revoke execute on function public.tg_touch_updated_at() from anon, authenticated;
revoke execute on function public.recalc_rent_status() from anon, authenticated;
