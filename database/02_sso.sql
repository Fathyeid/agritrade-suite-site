create or replace function public.gs_sso() returns jsonb language plpgsql security definer set search_path to 'public','extensions' as $f$
declare u gs_users; em text;
begin
 em:=lower(coalesce(auth.jwt()->>'email',''));
 if em='' or coalesce(auth.jwt()->>'role','')<>'authenticated' then raise exception 'not_authorized'; end if;
 select * into u from gs_users where lower(email)=em and active;
 if u.id is null then raise exception 'no_grain_account'; end if;
 return jsonb_build_object('token',gs_sign(u.id,720),'user',jsonb_build_object('id',u.id,'email',u.email,'full_name',u.full_name,'role',u.role,'locale',u.locale));
end $f$;
revoke all on function public.gs_sso() from public, anon;
grant execute on function public.gs_sso() to authenticated;
