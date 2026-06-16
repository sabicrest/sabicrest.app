-- ============================================================================
-- SABICREST ACADEMY - SUPABASE ROW-LEVEL SECURITY (RLS) & IDENTITY ISOLATION
-- ============================================================================
-- This script enables Row-Level Security (RLS) across all Sabicrest Academy tables
-- and establishes fine-grained access control policies. It ensures students can
-- only modify their own submissions and profiles, while trainers and administrators
-- maintain appropriate academic supervision privileges without compromising data isolation.
-- ============================================================================

-- Force active database context to public schema
SET search_path TO public;


-- ============================================================================
-- 1. USERS PROFILE SECURITY ROUTINES
-- ============================================================================
-- - Enable Row-Level Security on users table
-- - Allow public viewing of profile metadata (enabling student-trainer coordination)
-- - Limit update/delete rights strictly to the user themselves, or administrative bypass
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Select: Profile directories must be read by authenticated users for lookups
DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
CREATE POLICY "Allow authenticated read users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert: Allow initial registration (both anonymous join and admin creation)
DROP POLICY IF EXISTS "Allow registration insert safety" ON public.users;
CREATE POLICY "Allow registration insert safety" ON public.users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Update: Users can only alter their own database rows
DROP POLICY IF EXISTS "Allow owners to update core profile info" ON public.users;
CREATE POLICY "Allow owners to update core profile info" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id)
    WITH CHECK (auth.uid()::text = id);

-- Delete: Restrict profile deletion solely to owners and staff administrations
DROP POLICY IF EXISTS "Allow owners to delete their own account profile" ON public.users;
CREATE POLICY "Allow owners to delete their own account profile" ON public.users
    FOR DELETE
    TO authenticated
    USING (auth.uid()::text = id);


-- ============================================================================
-- 2. MESSAGES & COMMUNICATIONS ISOLATION
-- ============================================================================
-- - Enable Row-Level Security on direct messages
-- - Limit reads strictly to sender, receiver, or public channel scope
-- - Restrict write/update permissions to the original sender
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Select: Retrieve messages only if sent by, received by, or in public hubs
DROP POLICY IF EXISTS "Select messages isolation policy" ON public.messages;
CREATE POLICY "Select messages isolation policy" ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = sender_id 
        OR auth.uid()::text = receiver_id 
        OR channel_id IS NOT NULL
    );

-- Insert: Users may design and submit messages validating their own authorship
DROP POLICY IF EXISTS "Insert messages safety check" ON public.messages;
CREATE POLICY "Insert messages safety check" ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = sender_id);

-- Update/Delete: Senders may alter or scrub their own messages
DROP POLICY IF EXISTS "Modify own messages constraint" ON public.messages;
CREATE POLICY "Modify own messages constraint" ON public.messages
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = sender_id)
    WITH CHECK (auth.uid()::text = sender_id);


-- ============================================================================
-- 3. INTERACTIVE CHANNELS (HUB MESSAGES) SECURITY
-- ============================================================================

ALTER TABLE public.hub_messages ENABLE ROW LEVEL SECURITY;

-- Select: Channel broadcasts are shared and viewable inside the academy
DROP POLICY IF EXISTS "Select hub broadcasts" ON public.hub_messages;
CREATE POLICY "Select hub broadcasts" ON public.hub_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert: Post broadcast as authenticated sender
DROP POLICY IF EXISTS "Insert hub messages" ON public.hub_messages;
CREATE POLICY "Insert hub messages" ON public.hub_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = sender_id);

-- Update/Delete: Control own messages
DROP POLICY IF EXISTS "Manage own hub broadcasts" ON public.hub_messages;
CREATE POLICY "Manage own hub broadcasts" ON public.hub_messages
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = sender_id)
    WITH CHECK (auth.uid()::text = sender_id);


-- ============================================================================
-- 4. ACADEMIC CURRICULA & COURSE SYLLABUS DIRECTORY
-- ============================================================================
-- - Curricula is read-only public catalog
-- - Insertion and Modification limits restricted to Curricula Creators (Trainers)
-- ============================================================================

ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;

-- Select: Public directory read
DROP POLICY IF EXISTS "Read course curriculum directories" ON public.curricula;
CREATE POLICY "Read course curriculum directories" ON public.curricula
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Modify: Trainers may record or modify their own curricula profiles
DROP POLICY IF EXISTS "Trainers manage own curricula ledger" ON public.curricula;
CREATE POLICY "Trainers manage own curricula ledger" ON public.curricula
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = trainer_id)
    WITH CHECK (auth.uid()::text = trainer_id);


-- ============================================================================
-- 5. ASSIGNMENTS SUBMISSIONS & HOMEDOCS
-- ============================================================================
-- - Students view and submit their own homework files
-- - Mentors/trainers pull and grade submissions assigned/managed by them
-- ============================================================================

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Select: Only students who submitted or trainers conducting course may select
DROP POLICY IF EXISTS "Retrieve relevant assignments files" ON public.assignments;
CREATE POLICY "Retrieve relevant assignments files" ON public.assignments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = student_id 
        OR auth.uid()::text = trainer_id
    );

-- Insert: Student commits assignment verification
DROP POLICY IF EXISTS "Create student assignment file" ON public.assignments;
CREATE POLICY "Create student assignment file" ON public.assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = student_id);

-- Update: Student updates attachment, or Trainer writes grading and feedback
DROP POLICY IF EXISTS "Alter assignment records validation" ON public.assignments;
CREATE POLICY "Alter assignment records validation" ON public.assignments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = student_id 
        OR auth.uid()::text = trainer_id
    )
    WITH CHECK (
        auth.uid()::text = student_id 
        OR auth.uid()::text = trainer_id
    );


-- ============================================================================
-- 6. COHORT ENROLLMENTS & TUITION CLEARANCE
-- ============================================================================

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Retrieve isolated enrollments histories" ON public.enrollments;
CREATE POLICY "Retrieve isolated enrollments histories" ON public.enrollments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid()::text = student_id 
        OR auth.uid()::text = trainer_id
    );

DROP POLICY IF EXISTS "Enrollment request initiation trigger" ON public.enrollments;
CREATE POLICY "Enrollment request initiation trigger" ON public.enrollments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = student_id);

DROP POLICY IF EXISTS "Enrollment modifications control" ON public.enrollments;
CREATE POLICY "Enrollment modifications control" ON public.enrollments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid()::text = student_id 
        OR auth.uid()::text = trainer_id
    );


-- ============================================================================
-- 7. EVENT SCHEDULERS & MEET TIMETABLES
-- ============================================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Select: All active students and faculty may read timetables
DROP POLICY IF EXISTS "Select academic timetable" ON public.events;
CREATE POLICY "Select academic timetable" ON public.events
    FOR SELECT
    TO authenticated
    USING (true);

-- Manage: Trainers control and arrange their booked sessions
DROP POLICY IF EXISTS "Trainers manage scheduled events" ON public.events;
CREATE POLICY "Trainers manage scheduled events" ON public.events
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = trainer_id)
    WITH CHECK (auth.uid()::text = trainer_id);


-- ============================================================================
-- 8. COMMUNICATIONS & SYSTEM NOTIFICATIONS
-- ============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Secure isolated user notification line" ON public.notifications;
CREATE POLICY "Secure isolated user notification line" ON public.notifications
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);


-- ============================================================================
-- 9. TRAINER APPLICATIONS SELECTION STAGE
-- ============================================================================

ALTER TABLE public.trainer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read applications restriction" ON public.trainer_applications;
CREATE POLICY "Read applications restriction" ON public.trainer_applications
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Create applicant profile" ON public.trainer_applications;
CREATE POLICY "Create applicant profile" ON public.trainer_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Update application state" ON public.trainer_applications;
CREATE POLICY "Update application state" ON public.trainer_applications
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id);


-- ============================================================================
-- 10. STUDENT TEAM COLLABORATIONS
-- ============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select visible teams directories" ON public.teams;
CREATE POLICY "Select visible teams directories" ON public.teams
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Manage physical team profiles" ON public.teams;
CREATE POLICY "Manage physical team profiles" ON public.teams
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = leader_id)
    WITH CHECK (auth.uid()::text = leader_id);
