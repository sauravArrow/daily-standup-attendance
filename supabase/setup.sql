-- Daily Standup Attendance: run this entire script once in Supabase SQL Editor.
-- Access is restricted to authenticated users. Do not add anon/public write policies.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('Present','Leave','WorkingFromHome','InMeeting','Absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_member_date_unique unique (member_id, attendance_date)
);

create index if not exists attendance_records_date_idx on public.attendance_records(attendance_date);

alter table public.team_members enable row level security;
alter table public.attendance_records enable row level security;

grant select, insert, update on public.team_members to authenticated;
grant select, insert, update, delete on public.attendance_records to authenticated;

drop policy if exists "Authenticated users can read team members" on public.team_members;
create policy "Authenticated users can read team members" on public.team_members for select to authenticated using (true);
drop policy if exists "Authenticated users can add team members" on public.team_members;
create policy "Authenticated users can add team members" on public.team_members for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update team members" on public.team_members;
create policy "Authenticated users can update team members" on public.team_members for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read attendance" on public.attendance_records;
create policy "Authenticated users can read attendance" on public.attendance_records for select to authenticated using (true);
drop policy if exists "Authenticated users can add attendance" on public.attendance_records;
create policy "Authenticated users can add attendance" on public.attendance_records for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update attendance" on public.attendance_records;
create policy "Authenticated users can update attendance" on public.attendance_records for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete attendance" on public.attendance_records;
create policy "Authenticated users can delete attendance" on public.attendance_records for delete to authenticated using (true);

-- Enable realtime events for both tables. If the table is already in the publication,
-- Supabase may report a duplicate; in that case, ignore that line's duplicate error.
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.attendance_records;

-- Seed the initial team and today's attendance only when the team table is empty.
do $$
declare
  v_today date := current_date;
begin
  if not exists (select 1 from public.team_members) then
    create temporary table seed_team (name text, status text) on commit drop;
    insert into seed_team (name, status) values
      ('Vishwas Patki','Present'), ('Ajay Rohilla','Absent'), ('Sachin Gaikwad','Present'), ('Akshay Gajbe','Present'),
      ('Patricia Halstead','Present'), ('Ramchandra Salunkhe','Present'), ('Dhaivat Patel','Present'), ('Narayan Botre','Present'),
      ('Pankaj Rawat','Absent'), ('Dhruv Harawat','Present'), ('Niraj Vishwakarma','Absent'), ('Vaibhav Pawar','Present'),
      ('Piyush Panjwani','Absent'), ('Avinash Sharma','Present'), ('Milind Sharma','Present'), ('Chaitanya Estarala','Absent'),
      ('Paras Mal','Present'), ('Mitesh Solanki','Absent'), ('Kashish Gupta','Absent'), ('Labhansh Patel','Present'),
      ('Milind Parkhe','Absent'), ('Saurabh Dhalan','Present'), ('Santosh Pandey','Absent'), ('Bharat Sherla','Absent'),
      ('Sunil Nannawre','Present'), ('Anurag','Present'), ('Samruddhi','Present'), ('Ashish','Absent'), ('Nikita','Present'), ('Vishal','Present');

    insert into public.team_members (name, active)
    select name, true from seed_team;

    insert into public.attendance_records (member_id, attendance_date, status)
    select m.id, v_today, s.status
    from public.team_members m
    join seed_team s on s.name = m.name;
  end if;
end $$;
