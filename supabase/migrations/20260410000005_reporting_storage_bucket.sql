-- =============================================================================
-- Migration: Reporting System Storage Bucket (ftr-008)
-- =============================================================================
-- Creates the Supabase Storage bucket for archived PDF reports and
-- configures access policies for tenant-isolated report storage.
--
-- Bucket: 'reports'
-- Structure: reports/{tenant_id}/{year}/{month}/{report_type}_{timestamp}.pdf
--
-- Access policies:
--   - Authenticated users can read files within their own tenant path
--   - Authenticated users can upload files to their own tenant path
--   - Admin users can delete files within their own tenant path
--
-- Note: Storage bucket creation via SQL uses the storage schema API.
-- If the bucket already exists this is a no-op (INSERT ... ON CONFLICT).
--
-- Rollback:
--   DELETE FROM storage.objects WHERE bucket_id = 'reports';
--   DELETE FROM storage.buckets WHERE id = 'reports';
-- =============================================================================


-- =============================================================================
-- STEP 1: Create the 'reports' storage bucket
-- =============================================================================
-- Private bucket (not publicly accessible). All access requires JWT auth.
-- File size limit: 50MB (generous for PDFs with embedded images).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reports',
    'reports',
    false,
    52428800,  -- 50 MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- STEP 2: Storage access policies
-- =============================================================================
-- Policies use the folder structure to enforce tenant isolation:
-- files are stored as reports/{tenant_id}/... and policies verify
-- the first path segment matches the user's tenant_id from JWT claims.

-- SELECT (read/download) -- authenticated users within their tenant
CREATE POLICY "reports_select_own_tenant"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'reports'
        AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    );

-- INSERT (upload) -- authenticated users within their tenant
CREATE POLICY "reports_insert_own_tenant"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'reports'
        AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    );

-- UPDATE (overwrite) -- authenticated users within their tenant
CREATE POLICY "reports_update_own_tenant"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'reports'
        AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    );

-- DELETE -- admin role only, within their tenant
CREATE POLICY "reports_delete_admin_only"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'reports'
        AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
        AND (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );
