-- Esquema de Base de Datos para FoodsFit

-- 1. TABLA DE PERFILES (Profiles)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  calorie_goal integer default 2000 not null,
  weight_goal numeric default null
);

-- Habilitar RLS en profiles
alter table public.profiles enable row level security;

-- Políticas de seguridad para profiles
create policy "Los usuarios pueden ver su propio perfil." on public.profiles
  for select using (auth.uid() = id);

create policy "Los usuarios pueden actualizar su propio perfil." on public.profiles
  for update using (auth.uid() = id);

create policy "Los usuarios pueden insertar su propio perfil." on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger para crear perfil automáticamente cuando se registre un nuevo usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, calorie_goal)
  values (new.id, 2000);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. TABLA DE PLATOS PERSONALIZADOS (Custom Meals)
create table public.custom_meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  kcal_per_100g numeric not null check (kcal_per_100g >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Evitar platos duplicados con el mismo nombre para el mismo usuario
  unique(user_id, name)
);

-- Habilitar RLS en custom_meals
alter table public.custom_meals enable row level security;

-- Políticas de seguridad para custom_meals
create policy "Los usuarios pueden ver sus propios platos." on public.custom_meals
  for select using (auth.uid() = user_id);

create policy "Los usuarios pueden insertar sus propios platos." on public.custom_meals
  for insert with check (auth.uid() = user_id);

create policy "Los usuarios pueden actualizar sus propios platos." on public.custom_meals
  for update using (auth.uid() = user_id);

create policy "Los usuarios pueden eliminar sus propios platos." on public.custom_meals
  for delete using (auth.uid() = user_id);


-- 3. TABLA DE REGISTROS DE COMIDAS (Daily Meals Log)
create table public.meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date default current_date not null,
  name text not null,
  grams numeric not null check (grams > 0),
  kcal numeric not null check (kcal >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en meals
alter table public.meals enable row level security;

-- Políticas de seguridad para meals
create policy "Los usuarios pueden ver sus propios registros de comidas." on public.meals
  for select using (auth.uid() = user_id);

create policy "Los usuarios pueden insertar sus propios registros de comidas." on public.meals
  for insert with check (auth.uid() = user_id);

create policy "Los usuarios pueden actualizar sus propios registros de comidas." on public.meals
  for update using (auth.uid() = user_id);

create policy "Los usuarios pueden eliminar sus propios registros de comidas." on public.meals
  for delete using (auth.uid() = user_id);


-- 4. TABLA DE REGISTROS DE PESO (Weight Log)
create table public.weights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date default current_date not null,
  weight numeric not null check (weight > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Asegurar un solo registro de peso por día y usuario
  unique(user_id, date)
);

-- Habilitar RLS en weights
alter table public.weights enable row level security;

-- Políticas de seguridad para weights
create policy "Los usuarios pueden ver sus propios registros de peso." on public.weights
  for select using (auth.uid() = user_id);

create policy "Los usuarios pueden insertar sus propios registros de peso." on public.weights
  for insert with check (auth.uid() = user_id);

create policy "Los usuarios pueden actualizar sus propios registros de peso." on public.weights
  for update using (auth.uid() = user_id);

create policy "Los usuarios pueden eliminar sus propios registros de peso." on public.weights
  for delete using (auth.uid() = user_id);
