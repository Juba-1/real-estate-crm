BEGIN;

-- ==========================================
-- 1. PRIVATE SCHEMA
-- ==========================================
CREATE SCHEMA IF NOT EXISTS private_schema;

-- Auth-only helper (no table dependencies — safe to create early)
CREATE OR REPLACE FUNCTION private_schema.get_auth_user()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid();
$$;

-- ==========================================
-- 2. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'agent');
CREATE TYPE property_type AS ENUM ('apartment', 'villa', 'land', 'commercial', 'building');
CREATE TYPE offer_type AS ENUM ('sale', 'rent');
CREATE TYPE property_status AS ENUM ('available', 'pending', 'sold', 'rented');
CREATE TYPE request_status AS ENUM ('active', 'executed', 'archived');
CREATE TYPE visibility_type AS ENUM ('company_only', 'global');

-- ==========================================
-- 3. TABLES
-- ==========================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role user_role DEFAULT 'agent',
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type property_type NOT NULL,
    offer_type offer_type NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    price NUMERIC NOT NULL,
    area NUMERIC NOT NULL,
    specs JSONB DEFAULT '{}'::jsonb,
    images TEXT[] DEFAULT '{}',
    is_direct BOOLEAN DEFAULT true,
    status property_status DEFAULT 'available',
    visibility visibility_type DEFAULT 'company_only',
    general_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE property_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    private_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type property_type NOT NULL,
    offer_type offer_type NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    details TEXT NOT NULL,
    status request_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
);

-- ==========================================
-- 4. SECURITY FUNCTIONS (after users table)
-- ==========================================
CREATE OR REPLACE FUNCTION private_schema.get_user_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private_schema.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION private_schema.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION private_schema.get_auth_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private_schema.get_user_company_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private_schema.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private_schema.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private_schema.get_auth_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private_schema.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private_schema.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private_schema.is_super_admin() TO authenticated;

-- ==========================================
-- 5. TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION private_schema.set_property_status_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_property_status_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION private_schema.set_property_status_updated_at();

-- ==========================================
-- 6. ENABLE RLS
-- ==========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. FULL RLS POLICIES
-- ==========================================

-- COMPANIES
CREATE POLICY "Users view their own company" ON companies FOR SELECT
  TO authenticated
  USING (id = private_schema.get_user_company_id() OR private_schema.is_super_admin());

CREATE POLICY "Super Admins manage companies" ON companies FOR ALL
  TO authenticated
  USING (private_schema.is_super_admin())
  WITH CHECK (private_schema.is_super_admin());

-- USERS
CREATE POLICY "Users view company colleagues" ON users FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id() OR private_schema.is_super_admin());

CREATE POLICY "Admins manage company users" ON users FOR ALL
  TO authenticated
  USING ((company_id = private_schema.get_user_company_id() AND private_schema.is_admin()) OR private_schema.is_super_admin())
  WITH CHECK ((company_id = private_schema.get_user_company_id() AND private_schema.is_admin()) OR private_schema.is_super_admin());

-- PROPERTIES (Public Specs)
CREATE POLICY "View properties" ON properties FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id() OR visibility = 'global');

CREATE POLICY "Insert properties" ON properties FOR INSERT
  TO authenticated
  WITH CHECK (company_id = private_schema.get_user_company_id() AND agent_id = private_schema.get_auth_user());

CREATE POLICY "Update/Delete properties" ON properties FOR ALL
  TO authenticated
  USING ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin())
  WITH CHECK ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin());

-- PROPERTY OWNERS (Confidential - No Joins Needed)
CREATE POLICY "View property owners" ON property_owners FOR SELECT
  TO authenticated
  USING ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin());

CREATE POLICY "Insert property owners" ON property_owners FOR INSERT
  TO authenticated
  WITH CHECK (company_id = private_schema.get_user_company_id() AND agent_id = private_schema.get_auth_user());

CREATE POLICY "Update/Delete property owners" ON property_owners FOR ALL
  TO authenticated
  USING ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin())
  WITH CHECK ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin());

-- REQUESTS
CREATE POLICY "View company requests" ON requests FOR SELECT
  TO authenticated
  USING (company_id = private_schema.get_user_company_id());

CREATE POLICY "Insert requests" ON requests FOR INSERT
  TO authenticated
  WITH CHECK (company_id = private_schema.get_user_company_id() AND agent_id = private_schema.get_auth_user());

CREATE POLICY "Update/Delete requests" ON requests FOR ALL
  TO authenticated
  USING ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin())
  WITH CHECK ((agent_id = private_schema.get_auth_user()) OR private_schema.is_admin());

COMMIT;
