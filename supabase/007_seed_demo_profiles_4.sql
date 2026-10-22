-- 007 (part 4 of 4): synthetic demo profiles — GENERATED, do not edit by hand.
-- Source: scripts/demo-seed/data/*.mjs → node scripts/demo-seed/build.mjs
--
-- Run in the Supabase SQL editor after 006_demo_flag.sql, parts 1 → 4.
-- Idempotent: profiles upsert on handle (fixed ids), and this part's portfolio
-- items are deleted and re-inserted. Re-running converges to the seed.
-- Every profile here is fictional, is_demo = true, handle prefixed demo-.
-- Remove all demo data with supabase/purge_demo.sql.

DO $check$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_demo') THEN
    RAISE EXCEPTION 'profiles.is_demo is missing: run supabase/006_demo_flag.sql first';
  END IF;
END $check$;

BEGIN;

-- Integra Gobernanza (demo-integra-gobernanza)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'fbe44c02-e3af-54cf-b923-d76dbf4f6807',
  NULL,
  $$Small Firm$$,
  $$demo-integra-gobernanza$$,
  $$Integra Gobernanza$$,
  $$Governance Consultancy | Anti-Corruption, Procurement Integrity & Citizen Engagement | Mexico & Central America$$,
  $$Mexico City, Mexico$$,
  NULL,
  2011,
  $$Registered in Mexico as Integra Gobernanza S.C.; contracts as a firm and partners with local firms in Guatemala and Honduras for in-country registration.$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '16 days',
  $$https://i.pravatar.cc/150?u=demo-integra-gobernanza$$,
  $$https://picsum.photos/seed/demo-integra-gobernanza/800/200$$,
  $$Integra Gobernanza is a Mexico City consultancy of nine specialists working on anti-corruption, public procurement integrity and citizen engagement across Mexico and Central America. Founded in 2011 by former officials of Mexico's federal audit office and civil-society leaders, the firm designs integrity risk assessments, open contracting reforms and social accountability mechanisms for governments, development banks and foundations. Its team combines lawyers, policy analysts and survey researchers, and it has run national perception surveys on corruption and trust in public institutions. Integra has facilitated multi-stakeholder workshops in Guatemala, Honduras and El Salvador and publishes its methodologies openly in Spanish.$$,
  $$[{"name":"Anti-Corruption","tier":"primary","level":"item"},{"name":"Citizen Engagement","tier":"primary","level":"item"},{"name":"Justice Reform","tier":"secondary","level":"item"},{"name":"Public Procurement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Analysis","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Workshop Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Carolina Rojas Villalobos (demo-carolina-rojas-villalobos)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'dd11fc10-ddf0-5f7a-8f0a-4b343644ba2e',
  NULL,
  $$Individual$$,
  $$demo-carolina-rojas-villalobos$$,
  $$Carolina Rojas Villalobos$$,
  $$Writer & Editor for Governance Programmes | Audit Reports, Policy Papers | Central America$$,
  $$San José, Costa Rica$$,
  $$mid_career$$,
  NULL,
  $$Costa Rican citizen; invoices as a registered independent professional (Hacienda). Remote work only.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '33 days',
  $$https://i.pravatar.cc/150?u=demo-carolina-rojas-villalobos$$,
  $$https://picsum.photos/seed/demo-carolina-rojas-villalobos/800/200$$,
  $$Carolina Rojas Villalobos is a writer and editor who has spent ten years turning complex governance research into reports that ministers and citizens read. Much of her work sits inside public procurement and anti-corruption programmes: she co-authored the procurement audit reports of a regional transparency programme in Guatemala and Honduras, analysed red flags in contract data alongside the audit teams, and wrote the guidance that community committees use for citizen engagement in monitoring public works. She has also drafted trade and investment climate studies for regional economic bodies. Carolina works in Spanish, English and Portuguese and is often brought in at the analysis stage, not only for the final edit.$$,
  $$[{"name":"Trade & Competitiveness","tier":"primary","level":"item"},{"name":"Investment Climate","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Technical Writing","tier":"primary","level":"item"},{"name":"Policy Briefs","tier":"primary","level":"item"},{"name":"Academic Editing","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$, $$Portuguese$$]::text[],
  $$[{"organization":"Independent consultant","role":"Writer and Editor","start_year":2019,"end_year":null,"logo_url":null,"description":"Reports, policy papers and guidance for governance and economic programmes."},{"organization":"Programa Estado de la Nación","role":"Researcher and Editor","start_year":2014,"end_year":2019,"logo_url":null,"description":"Wrote and edited chapters of the State of the Region report."}]$$::jsonb,
  $$[{"institution":"Universidad de Costa Rica","degree_or_course":"Licenciatura en Ciencias Políticas","start_year":2008,"end_year":2013,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Saad Ahmed Malik (demo-saad-ahmed-malik)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '3051b2c9-2952-59c0-9a51-fb5a46feff79',
  NULL,
  $$Individual$$,
  $$demo-saad-ahmed-malik$$,
  $$Saad Ahmed Malik$$,
  $$Anti-Corruption & Justice Reform Specialist | Procurement Integrity | Pakistan$$,
  $$Islamabad, Pakistan$$,
  $$mid_career$$,
  NULL,
  $$Pakistani citizen; contracts as an individual consultant. Requires visas for most international travel.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  now() - interval '25 days',
  $$https://i.pravatar.cc/150?u=demo-saad-ahmed-malik$$,
  $$https://picsum.photos/seed/demo-saad-ahmed-malik/800/200$$,
  $$Saad Ahmed Malik is a governance specialist with eleven years of experience in anti-corruption, justice reform and public procurement integrity in Pakistan. He has advised provincial procurement regulatory authorities on e-procurement rules, evaluated anti-corruption establishments, and supported court automation and case management reforms. His policy analysis work includes a national study on procurement complaints and debarment, and he has trained procurement officers and auditors in risk-based audit. Saad writes policy briefs for parliamentary committees and facilitates consultations between government, bar associations and civil-society organizations.$$,
  $$[{"name":"Anti-Corruption","tier":"primary","level":"item"},{"name":"Justice Reform","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Analysis","tier":"primary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"},{"name":"Stakeholder Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Urdu$$, $$English$$, $$Punjabi$$]::text[],
  $$[{"organization":"UNDP Pakistan","role":"Governance Analyst","start_year":2019,"end_year":null,"logo_url":"https://cdn.brandfetch.io/undp.org","description":"Rule of law and anti-corruption programming with provincial governments."},{"organization":"Punjab Procurement Regulatory Authority","role":"Assistant Director","start_year":2014,"end_year":2019,"logo_url":null,"description":"Drafted e-procurement rules and handled procurement complaints."}]$$::jsonb,
  $$[{"institution":"Lahore University of Management Sciences","degree_or_course":"MPhil Public Policy","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Rania Haddad (demo-rania-haddad)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'ad4ddda8-3134-5870-b692-df168b1e2488',
  NULL,
  $$Individual$$,
  $$demo-rania-haddad$$,
  $$Rania Haddad$$,
  $$Social Cohesion & Refugee Response Researcher | Conflict Sensitivity | Lebanon, Jordan & Syria$$,
  $$Beirut, Lebanon$$,
  $$senior$$,
  NULL,
  $$Lebanese citizen; contracts as an individual or through her registered research consultancy in Beirut. Travels to Jordan without a visa requirement for short missions.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 45)::text, 'until', NULL),
  now() - interval '8 days',
  $$https://i.pravatar.cc/150?u=demo-rania-haddad$$,
  $$https://picsum.photos/seed/demo-rania-haddad/800/200$$,
  $$Rania Haddad has researched refugee response and social cohesion in Lebanon, Jordan and Syria for sixteen years. She designs mixed-methods studies of tension between refugee and host communities, combining household surveys, focus groups and conflict analysis, and turns them into conflict-sensitive programme recommendations. She has led social cohesion assessments in Tripoli, Akkar and the Bekaa for UN agencies and NGO consortia, evaluated the tension-monitoring system of the Lebanon Crisis Response Plan, and advised municipalities on dialogue mechanisms around services and jobs. Rania's qualitative research is known for reaching people who rarely speak to surveys: young men in informal work, women running home-based businesses, and landlords. She teaches a course on conflict-sensitive research methods at a university in Beirut.$$,
  $$[{"name":"Social Cohesion","tier":"primary","level":"item"},{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"Peacebuilding","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Workshop Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Do No Harm / Conflict Sensitivity Trainer","issuing_organization":"CDA Collaborative Learning","year":2016,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$, $$French$$]::text[],
  $$[{"organization":"Independent consultant","role":"Social Cohesion Researcher","start_year":2017,"end_year":null,"logo_url":null,"description":"Assessments and evaluations for UN agencies and NGO consortia in Lebanon and Jordan."},{"organization":"UNDP Lebanon","role":"Social Stability Analyst","start_year":2013,"end_year":2017,"logo_url":"https://cdn.brandfetch.io/undp.org","description":"Ran the tension-monitoring analysis for the Lebanon Crisis Response Plan."},{"organization":"International Rescue Committee","role":"Research Officer","start_year":2009,"end_year":2013,"logo_url":"https://cdn.brandfetch.io/rescue.org","description":"Protection and livelihoods research with Iraqi and Syrian refugees."}]$$::jsonb,
  $$[{"institution":"American University of Beirut","degree_or_course":"MA Sociology","start_year":2006,"end_year":2008,"logo_url":null},{"institution":"University of Sussex","degree_or_course":"MA Conflict, Security and Development","start_year":2011,"end_year":2012,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Omar Khalil Mansour (demo-omar-khalil-mansour)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '0213e357-91f3-5088-bfa2-08dcb9538133',
  NULL,
  $$Individual$$,
  $$demo-omar-khalil-mansour$$,
  $$Omar Khalil Mansour$$,
  $$Refugee Livelihoods & SME Support Specialist | Market Assessments | Jordan$$,
  $$Amman, Jordan$$,
  $$mid_career$$,
  NULL,
  $$Jordanian citizen. Currently under a UNHCR consultancy contract; available part-time for non-conflicting assignments with UNHCR approval.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '12 days',
  $$https://i.pravatar.cc/150?u=demo-omar-khalil-mansour$$,
  $$https://picsum.photos/seed/demo-omar-khalil-mansour/800/200$$,
  $$Omar Khalil Mansour is a livelihoods specialist with ten years of experience supporting Syrian refugees and vulnerable Jordanians to find work and grow small businesses. He currently advises UNHCR Jordan on livelihoods and economic inclusion, including work permits, home-based business registration and links to microfinance. He has led market assessments in Irbid, Mafraq and Zarqa that identified value chains with growth potential, designed SME support packages combining grants and business development services, and monitored the outcomes of cash-for-work and enterprise programmes. Omar combines market research and household surveys with close knowledge of the regulatory environment for refugee employment, and works with municipalities and the Ministry of Labour on social cohesion between refugees and host communities.$$,
  $$[{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"SME Support","tier":"primary","level":"item"},{"name":"Social Cohesion","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Monitoring & Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$]::text[],
  $$[{"organization":"UNHCR Jordan","role":"Livelihoods and Economic Inclusion Consultant","start_year":2021,"end_year":null,"logo_url":"https://cdn.brandfetch.io/unhcr.org","description":"Advises on refugee work permits, home-based businesses and access to finance."},{"organization":"Mercy Corps Jordan","role":"Livelihoods Program Manager","start_year":2017,"end_year":2021,"logo_url":null,"description":"Managed enterprise grants and business development services for refugees and Jordanians."},{"organization":"CARE International in Jordan","role":"Livelihoods Officer","start_year":2015,"end_year":2017,"logo_url":null,"description":"Ran cash-for-work and vocational training in urban host communities."}]$$::jsonb,
  $$[{"institution":"University of Jordan","degree_or_course":"MSc Economics","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Layla Nasser Odeh (demo-layla-nasser-odeh)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'c7639a01-8637-5ffc-b14d-0f6c72a0bbb3',
  NULL,
  $$Individual$$,
  $$demo-layla-nasser-odeh$$,
  $$Layla Nasser Odeh$$,
  $$Refugee Livelihoods & SME Support Specialist | Market Assessments | Jordan$$,
  $$Amman, Jordan$$,
  $$mid_career$$,
  NULL,
  $$Jordanian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '12 days',
  $$https://i.pravatar.cc/150?u=demo-layla-nasser-odeh$$,
  $$https://picsum.photos/seed/demo-layla-nasser-odeh/800/200$$,
  $$Layla Nasser Odeh is a livelihoods specialist with ten years of experience supporting Syrian refugees and vulnerable Jordanians to find work and grow small businesses. She spent five years with UNHCR Jordan on livelihoods and economic inclusion, including work permits, home-based business registration and links to microfinance. She has led market assessments in Irbid, Mafraq and Zarqa that identified value chains with growth potential, designed SME support packages combining grants and business development services, and monitored the outcomes of cash-for-work and enterprise programmes. Layla combines market research and qualitative research with close knowledge of the regulatory environment for refugee employment, and works with municipalities and the Ministry of Labour on social cohesion between refugees and host communities.$$,
  $$[{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"SME Support","tier":"primary","level":"item"},{"name":"Social Cohesion","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Qualitative Research","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$]::text[],
  $$[{"organization":"Mercy Corps Jordan","role":"Senior Livelihoods Advisor","start_year":2020,"end_year":null,"logo_url":null,"description":"Leads enterprise and access-to-finance programming for refugees and host communities."},{"organization":"UNHCR Jordan","role":"Livelihoods Officer","start_year":2015,"end_year":2020,"logo_url":"https://cdn.brandfetch.io/unhcr.org","description":"Worked on refugee work permits, home-based businesses and access to finance."}]$$::jsonb,
  $$[{"institution":"Yarmouk University","degree_or_course":"MA Development Economics","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'pending',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Levant Field Research Collective (demo-levant-field-research-collective)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '30e9acec-bbb9-5051-847a-d1353dd37a48',
  NULL,
  $$Small Firm$$,
  $$demo-levant-field-research-collective$$,
  $$Levant Field Research Collective$$,
  $$Field Research Firm | Refugee Livelihoods, Social Cohesion & Market Research | Jordan, Lebanon & Iraq$$,
  $$Amman, Jordan$$,
  NULL,
  2016,
  $$Registered in Jordan as a limited liability company with an affiliated registered office in Beirut. Contracts as a firm; holds research approvals for refugee camps in Jordan.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '5 days',
  $$https://i.pravatar.cc/150?u=demo-levant-field-research-collective$$,
  $$https://picsum.photos/seed/demo-levant-field-research-collective/800/200$$,
  $$Levant Field Research Collective is an Amman-based research firm founded in 2016 by Jordanian, Lebanese and Iraqi researchers. Its team of twelve core staff and a trained network of more than 150 Arabic- and Kurdish-speaking enumerators runs household surveys, qualitative research and market research for UN agencies and NGO consortia responding to the Syria and Iraq crises. The Collective specializes in refugee livelihoods, social cohesion between refugee and host communities, and humanitarian needs assessments, and has worked in Za'atari and Azraq camps, urban host communities in northern Jordan, and North Lebanon. Its statistical analysis team produces cleaned datasets, dashboards and reports in Arabic and English.$$,
  $$[{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"Social Cohesion","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"secondary","level":"item"},{"name":"SME Support","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Market Research","tier":"secondary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$, $$Kurdish$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Dilini Wickramasinghe (demo-dilini-wickramasinghe)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '3b555c66-e72e-58fb-845d-e9ce07138a70',
  NULL,
  $$Individual$$,
  $$demo-dilini-wickramasinghe$$,
  $$Dilini Wickramasinghe$$,
  $$Post-Conflict Recovery & Social Cohesion Advisor | Reconciliation Research | Sri Lanka & South Asia$$,
  $$Colombo, Sri Lanka$$,
  $$senior$$,
  NULL,
  $$Sri Lankan citizen; contracts as an individual consultant. Available for international missions.$$,
  ARRAY[$$Remote$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 90)::text, 'until', NULL),
  now() - interval '18 days',
  $$https://i.pravatar.cc/150?u=demo-dilini-wickramasinghe$$,
  $$https://picsum.photos/seed/demo-dilini-wickramasinghe/800/200$$,
  $$Dilini Wickramasinghe has worked on post-conflict reconstruction and social cohesion in Sri Lanka for twenty years, and more recently in Nepal and Myanmar. She led the qualitative research for a national reconciliation survey, evaluated livelihoods programmes for returning displaced families in the Northern Province, and has advised UN agencies on conflict-sensitive recovery planning. Her approach combines community-level qualitative research, policy analysis and facilitation of dialogue between communities divided by language and religion. She works in Sinhala, Tamil and English and has trained more than 300 local researchers in conflict-sensitive interviewing.$$,
  $$[{"name":"Post-Conflict Reconstruction","tier":"primary","level":"item"},{"name":"Social Cohesion","tier":"primary","level":"item"},{"name":"Peacebuilding","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Policy Analysis","tier":"secondary","level":"item"},{"name":"Workshop Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Sinhala$$, $$Tamil$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Social Cohesion Advisor","start_year":2016,"end_year":null,"logo_url":null,"description":"Recovery and reconciliation research for UN agencies and donors in South and Southeast Asia."},{"organization":"Centre for Poverty Analysis","role":"Senior Researcher","start_year":2008,"end_year":2016,"logo_url":null,"description":"Led research on post-war recovery and resettlement."},{"organization":"UNDP Sri Lanka","role":"Programme Analyst, Transition Recovery","start_year":2004,"end_year":2008,"logo_url":"https://cdn.brandfetch.io/undp.org","description":"Supported recovery of conflict-affected districts."}]$$::jsonb,
  $$[{"institution":"University of Colombo","degree_or_course":"MA Sociology","start_year":2002,"end_year":2004,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Joseph Ssemakula (demo-joseph-ssemakula)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '9d1f06a9-7ca3-54fb-80e2-a05e454951d1',
  NULL,
  $$Individual$$,
  $$demo-joseph-ssemakula$$,
  $$Joseph Ssemakula$$,
  $$Refugee Response & Humanitarian Programme Manager | Settlement Livelihoods | Uganda & South Sudan$$,
  $$Kampala, Uganda$$,
  $$senior$$,
  NULL,
  $$Ugandan citizen; contracts as an individual or through Ssemakula Development Consult Ltd.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '40 days',
  $$https://i.pravatar.cc/150?u=demo-joseph-ssemakula$$,
  $$https://picsum.photos/seed/demo-joseph-ssemakula/800/200$$,
  $$Joseph Ssemakula has managed refugee and humanitarian programmes in Uganda and South Sudan for seventeen years. He led livelihoods and peacebuilding programmes in the West Nile refugee settlements, where refugees and host communities share land and markets, and has managed multi-sector humanitarian aid budgets of more than $30 million. His strengths are programme management, partner coordination and monitoring systems that work in remote settlements. Joseph has worked closely with UNHCR, the Office of the Prime Minister and district local governments on Uganda's settlement approach, and has evaluated self-reliance programmes for refugees.$$,
  $$[{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"primary","level":"item"},{"name":"Peacebuilding","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"Monitoring & Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Luganda$$, $$Swahili$$]::text[],
  $$[{"organization":"Danish Refugee Council Uganda","role":"Area Manager, West Nile","start_year":2018,"end_year":null,"logo_url":null,"description":"Leads livelihoods, protection and peacebuilding programmes in refugee settlements."},{"organization":"World Vision South Sudan","role":"Programme Manager","start_year":2012,"end_year":2018,"logo_url":null,"description":"Managed humanitarian food assistance and livelihoods programmes."},{"organization":"Uganda Red Cross Society","role":"Programme Officer","start_year":2008,"end_year":2012,"logo_url":null,"description":"Coordinated emergency response in northern Uganda."}]$$::jsonb,
  $$[{"institution":"Makerere University","degree_or_course":"MA Development Studies","start_year":2005,"end_year":2007,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Rowena Bautista Lacson (demo-rowena-bautista-lacson)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '57e08d91-59a0-59d4-b146-bbd1d987a615',
  NULL,
  $$Individual$$,
  $$demo-rowena-bautista-lacson$$,
  $$Rowena Bautista Lacson$$,
  $$Agricultural Finance & Financial Inclusion Expert | Product Design for Rural Lenders | Philippines & Indonesia$$,
  $$Davao City, Philippines$$,
  $$senior$$,
  NULL,
  $$Filipino citizen; contracts as an individual or through Lacson Rural Finance Advisory (DTI-registered).$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '10 days',
  $$https://i.pravatar.cc/150?u=demo-rowena-bautista-lacson$$,
  $$https://picsum.photos/seed/demo-rowena-bautista-lacson/800/200$$,
  $$Rowena Bautista Lacson has designed agricultural finance products for rural banks, cooperatives and microfinance institutions in the Philippines and Indonesia for eighteen years. A former head of agricultural lending at a Mindanao rural bank, she knows how lenders price seasonal risk and why most loan products fail smallholders. As a consultant she has led market research combining farm household surveys with lender interviews, mapped financing gaps across coconut, coffee and banana value chains, and built financial models that partner institutions use to test portfolio performance before a pilot. Her work on agribusiness and rural development programmes financed by ADB and IFAD includes warehouse receipt financing, value-chain finance through off-takers, and crop insurance bundled with credit. She integrates gender analysis into every product design.$$,
  $$[{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"Agribusiness","tier":"primary","level":"item"},{"name":"Rural Development","tier":"secondary","level":"item"},{"name":"Food Security","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Certified Expert in Financial Inclusion Policy","issuing_organization":"Frankfurt School of Finance & Management","year":2016,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Filipino$$, $$English$$, $$Cebuano$$]::text[],
  $$[{"organization":"Independent consultant","role":"Agricultural Finance Specialist","start_year":2015,"end_year":null,"logo_url":null,"description":"Product design and market studies for rural lenders, ADB and IFAD projects."},{"organization":"Rural bank in Mindanao","role":"Head of Agricultural Lending","start_year":2008,"end_year":2015,"logo_url":null,"description":"Ran a 9,000-borrower smallholder loan portfolio."},{"organization":"Land Bank of the Philippines","role":"Credit Officer","start_year":2004,"end_year":2008,"logo_url":null,"description":"Agricultural credit appraisal for cooperatives."}]$$::jsonb,
  $$[{"institution":"University of the Philippines Los Baños","degree_or_course":"MS Agricultural Economics","start_year":2002,"end_year":2004,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Joaquin Reyes Manalo (demo-joaquin-reyes-manalo)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '1ab138f0-db40-596d-b6be-72a6ec048f58',
  NULL,
  $$Individual$$,
  $$demo-joaquin-reyes-manalo$$,
  $$Joaquin Reyes Manalo$$,
  $$Rural Finance Specialist | Financial Inclusion Policy & Financial Modeling | Asian Development Bank$$,
  $$Manila, Philippines$$,
  $$senior$$,
  NULL,
  $$Filipino citizen. Currently an ADB staff consultant; external assignments require ADB conflict-of-interest clearance.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '22 days',
  $$https://i.pravatar.cc/150?u=demo-joaquin-reyes-manalo$$,
  $$https://picsum.photos/seed/demo-joaquin-reyes-manalo/800/200$$,
  $$Joaquin Reyes Manalo is a rural finance specialist with sixteen years of experience, currently working as a consultant on the Asian Development Bank's agriculture and rural finance team in Manila. He supports the design of financial inclusion components in ADB loans to the Philippines, Indonesia and Vietnam, with a focus on credit guarantee schemes, digital payments for farmers and the investment climate for agricultural lending. He builds financial models of lending programmes and portfolio risk, reviews regulation affecting rural banks, and supervises market research by national firms. Before ADB he worked for the central bank's financial inclusion office and for a microfinance network.$$,
  $$[{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"Agribusiness","tier":"secondary","level":"item"},{"name":"Investment Climate","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Policy Analysis","tier":"secondary","level":"item"},{"name":"Market Research","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Filipino$$, $$English$$]::text[],
  $$[{"organization":"Asian Development Bank","role":"Rural Finance Consultant","start_year":2019,"end_year":null,"logo_url":"https://cdn.brandfetch.io/adb.org","description":"Designs financial inclusion and agricultural credit components of ADB operations."},{"organization":"Bangko Sentral ng Pilipinas","role":"Financial Inclusion Specialist","start_year":2013,"end_year":2019,"logo_url":null,"description":"Worked on regulation for rural banks and agent banking."},{"organization":"Microfinance Council of the Philippines","role":"Research Officer","start_year":2010,"end_year":2013,"logo_url":null,"description":"Industry research and performance benchmarking."}]$$::jsonb,
  $$[{"institution":"Ateneo de Manila University","degree_or_course":"MA Economics","start_year":2008,"end_year":2010,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Siti Rahmawati Nugroho (demo-siti-rahmawati-nugroho)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'c68b0449-f6f5-532f-9f24-78544ef1aff6',
  NULL,
  $$Individual$$,
  $$demo-siti-rahmawati-nugroho$$,
  $$Siti Rahmawati Nugroho$$,
  $$Agribusiness & Rural Finance Specialist | Market Research, Value Chains | Indonesia & Southeast Asia$$,
  $$Jakarta, Indonesia$$,
  $$senior$$,
  NULL,
  $$Indonesian citizen; contracts as an individual consultant (NPWP registered).$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '7 days',
  $$https://i.pravatar.cc/150?u=demo-siti-rahmawati-nugroho$$,
  $$https://picsum.photos/seed/demo-siti-rahmawati-nugroho/800/200$$,
  $$Siti Rahmawati Nugroho is an agribusiness and rural finance specialist with seventeen years of experience in Indonesia and Southeast Asia. She spent seven years at the Asian Development Bank's Indonesia Resident Mission, where she worked on agricultural value chain and rural finance projects, before becoming an independent consultant. She has led market research on smallholder finance in coffee, cocoa and maize value chains, designed value-chain finance products with agribusiness off-takers, and advised cooperatives on sustainable farming certification linked to premium buyers. Siti uses farm household surveys and financial modeling to size financing gaps and has worked with IFAD and the World Bank on rural development programmes in Eastern Java and Sulawesi.$$,
  $$[{"name":"Agribusiness","tier":"primary","level":"item"},{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"Sustainable Farming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Financial Modeling","tier":"secondary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Indonesian$$, $$English$$, $$Javanese$$]::text[],
  $$[{"organization":"Independent consultant","role":"Agribusiness and Rural Finance Specialist","start_year":2019,"end_year":null,"logo_url":null,"description":"Value chain and finance studies for IFAD, the World Bank and private agribusiness."},{"organization":"Asian Development Bank","role":"Project Officer, Agriculture and Rural Development","start_year":2012,"end_year":2019,"logo_url":"https://cdn.brandfetch.io/adb.org","description":"Worked on agricultural value chain and rural finance projects at the Indonesia Resident Mission."},{"organization":"Bank Rakyat Indonesia","role":"Microcredit Analyst","start_year":2008,"end_year":2012,"logo_url":null,"description":"Analysed microcredit products for rural borrowers."}]$$::jsonb,
  $$[{"institution":"IPB University (Bogor Agricultural University)","degree_or_course":"MSc Agribusiness","start_year":2006,"end_year":2008,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Rizky Pratama Wibowo (demo-rizky-pratama-wibowo)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '9323ce82-5adf-5dbf-bbb4-cd2f7d37cf83',
  NULL,
  $$Individual$$,
  $$demo-rizky-pratama-wibowo$$,
  $$Rizky Pratama Wibowo$$,
  $$Agricultural Finance Analyst | Market Research & Financial Inclusion | Indonesia & Philippines$$,
  $$Jakarta, Indonesia$$,
  $$mid_career$$,
  NULL,
  $$Indonesian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '3 days',
  $$https://i.pravatar.cc/150?u=demo-rizky-pratama-wibowo$$,
  $$https://picsum.photos/seed/demo-rizky-pratama-wibowo/800/200$$,
  $$Rizky Pratama Wibowo is an agricultural finance analyst based in Jakarta with seven years of experience in financial inclusion for smallholder farmers in Indonesia and the Philippines. He has run market research for rural banks and microfinance institutions, combining demand-side surveys of farm households with interviews of lenders, input suppliers and aggregators in coffee, maize and seaweed value chains. He designs survey instruments, cleans and analyses the data in R, and turns the results into product recommendations such as seasonal loans and value-chain finance through off-takers. Recent work includes a gender analysis of women farmers' access to credit and a review of digital financial services used by cooperatives in Nusa Tenggara.$$,
  $$[{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"Agribusiness","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Indonesian$$, $$English$$]::text[],
  $$[{"organization":"MicroSave Consulting","role":"Senior Analyst","start_year":2021,"end_year":null,"logo_url":null,"description":"Market research for rural banks and microfinance institutions."},{"organization":"Bank Rakyat Indonesia","role":"Research Analyst","start_year":2018,"end_year":2021,"logo_url":null,"description":"Analysed rural lending data."}]$$::jsonb,
  $$[{"institution":"Universitas Gadjah Mada","degree_or_course":"MSc Agricultural Economics","start_year":2016,"end_year":2018,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Dimas Arya Saputra (demo-dimas-arya-saputra)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '3414945d-10cc-5c79-a90d-c47c5ff7681b',
  NULL,
  $$Individual$$,
  $$demo-dimas-arya-saputra$$,
  $$Dimas Arya Saputra$$,
  $$Agricultural Finance Analyst | Market Research & Financial Inclusion | Indonesia & Philippines$$,
  $$Jakarta, Indonesia$$,
  $$mid_career$$,
  NULL,
  $$Indonesian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '95 days',
  $$https://i.pravatar.cc/150?u=demo-dimas-arya-saputra$$,
  $$https://picsum.photos/seed/demo-dimas-arya-saputra/800/200$$,
  $$Dimas Arya Saputra is an agricultural finance analyst based in Jakarta with seven years of experience in financial inclusion for smallholder farmers in Indonesia and the Philippines. He has run market research for rural banks and microfinance institutions, combining demand-side surveys of farm households with interviews of lenders, input suppliers and aggregators in coffee, maize and seaweed value chains. He designs survey instruments, cleans and analyses the data in R, and turns the results into product recommendations such as seasonal loans and value-chain finance through off-takers. Recent work includes a gender analysis of women farmers' access to credit and a review of digital financial services used by cooperatives in Nusa Tenggara.$$,
  $$[{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"Agribusiness","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Indonesian$$, $$English$$]::text[],
  $$[{"organization":"Mercy Corps Indonesia","role":"Agri-Finance Analyst","start_year":2020,"end_year":null,"logo_url":null,"description":"Market research and product design support for agricultural lenders."},{"organization":"Bank Mandiri","role":"Credit Analyst","start_year":2017,"end_year":2020,"logo_url":null,"description":"Appraised SME and agricultural loans."}]$$::jsonb,
  $$[{"institution":"Universitas Indonesia","degree_or_course":"MSc Economics","start_year":2015,"end_year":2017,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Nguyễn Thu Hà (demo-nguyen-thu-ha)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '890c205e-4c05-509e-95e3-5bef6e708547',
  NULL,
  $$Individual$$,
  $$demo-nguyen-thu-ha$$,
  $$Nguyễn Thu Hà$$,
  $$Agribusiness Value Chain Specialist | Smallholder Coffee, Rice & Seaweed | Vietnam & Southeast Asia$$,
  $$Hanoi, Vietnam$$,
  $$mid_career$$,
  NULL,
  $$Vietnamese citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 75)::text, 'until', NULL),
  now() - interval '28 days',
  $$https://i.pravatar.cc/150?u=demo-nguyen-thu-ha$$,
  $$https://picsum.photos/seed/demo-nguyen-thu-ha/800/200$$,
  $$Nguyễn Thu Hà is an agribusiness specialist who has worked with smallholder farmers and agri-SMEs across Vietnam, the Philippines and Indonesia for twelve years. Her work sits where value chains meet finance: she has run market research on the credit needs of coffee and rice cooperatives, built financial modeling tools that agricultural lenders use to price seasonal loans, and helped seaweed processors design supplier finance for the farmers who sell to them. She has worked on financial inclusion projects for IFAD and the World Bank and with impact investors entering Southeast Asian agriculture. Hà is a practical facilitator who brings farmers, lenders and buyers into the same room to agree on how credit and repayment should follow the harvest.$$,
  $$[{"name":"Agribusiness","tier":"primary","level":"item"},{"name":"Sustainable Farming","tier":"primary","level":"item"},{"name":"Rural Development","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Stakeholder Facilitation","tier":"primary","level":"item"},{"name":"Technical Writing","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Vietnamese$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Agribusiness Specialist","start_year":2020,"end_year":null,"logo_url":null,"description":"Value chain and agri-finance assignments in Southeast Asia."},{"organization":"SNV Vietnam","role":"Agriculture Advisor","start_year":2015,"end_year":2020,"logo_url":null,"description":"Supported coffee and rice value chains in the Central Highlands and Mekong Delta."},{"organization":"Oxfam in Vietnam","role":"Programme Officer","start_year":2013,"end_year":2015,"logo_url":null,"description":"Worked with farmer cooperatives on market access."}]$$::jsonb,
  $$[{"institution":"Wageningen University","degree_or_course":"MSc Management, Economics and Consumer Studies","start_year":2011,"end_year":2013,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Archipelago Rural Finance Partners (demo-archipelago-rural-finance-partners)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '168c1631-3aa7-59c3-bcd4-720845c01b38',
  NULL,
  $$Large Firm$$,
  $$demo-archipelago-rural-finance-partners$$,
  $$Archipelago Rural Finance Partners$$,
  $$Agri-Finance Advisory Firm | Financial Inclusion, Market Research & Product Design | Southeast Asia$$,
  $$Singapore, Singapore$$,
  NULL,
  2005,
  $$Registered in Singapore (Pte. Ltd.) with subsidiaries in Jakarta and Manila. Contracts as a firm; experienced with ADB, IFAD and World Bank procurement.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '15 days',
  $$https://i.pravatar.cc/150?u=demo-archipelago-rural-finance-partners$$,
  $$https://picsum.photos/seed/demo-archipelago-rural-finance-partners/800/200$$,
  $$Archipelago Rural Finance Partners is a Singapore-headquartered advisory firm of 85 staff with offices in Jakarta and Manila. Since 2005 it has helped rural banks, cooperatives, microfinance institutions and agribusinesses across Southeast Asia design and scale financial services for smallholder farmers. The firm's practice areas are market research and demand studies, product design with financial modeling, risk and portfolio management, and impact evaluation of financial inclusion programmes. It has delivered more than 150 assignments for ADB, IFAD, the World Bank, IFC and national development banks, including agricultural finance facilities in the Philippines, Indonesia, Vietnam and Cambodia, and has its own survey teams fluent in local languages.$$,
  $$[{"name":"Agribusiness","tier":"primary","level":"item"},{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"Investment Climate","tier":"secondary","level":"item"},{"name":"Climate Adaptation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Market Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Impact Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"SGS","year":2019,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Indonesian$$, $$Filipino$$, $$Vietnamese$$, $$Thai$$, $$Khmer$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Neema Mwakyusa (demo-neema-mwakyusa)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '35d63c36-07b5-5f22-9a9e-d8e994374d5a',
  NULL,
  $$Individual$$,
  $$demo-neema-mwakyusa$$,
  $$Neema Mwakyusa$$,
  $$Fintech & Financial Inclusion Data Analyst | Mobile Money Analytics | Tanzania$$,
  $$Dar es Salaam, Tanzania$$,
  $$early_career$$,
  NULL,
  $$Tanzanian citizen; contracts as an individual.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 120)::text),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 30)::text),
  now() - interval '410 days',
  $$https://i.pravatar.cc/150?u=demo-neema-mwakyusa$$,
  $$https://picsum.photos/seed/demo-neema-mwakyusa/800/200$$,
  $$Neema Mwakyusa is a data analyst working on financial inclusion and digital finance in Tanzania. Over four years she has analysed mobile money transaction data for a fintech start-up, built credit scoring prototypes in Python for small merchants, and supported market research on the use of savings groups and mobile wallets by urban SMEs in Dar es Salaam and Mwanza. She is comfortable with large datasets, dashboards and survey data, and has presented her findings to the central bank's fintech working group. Neema is looking to apply her data science skills to development programmes that expand access to finance for women and young entrepreneurs.$$,
  $$[{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"SME Support","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Data Science","tier":"primary","level":"item"},{"name":"Python/R","tier":"secondary","level":"item"},{"name":"Market Research","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Swahili$$, $$English$$]::text[],
  $$[{"organization":"Fintech start-up (Dar es Salaam)","role":"Data Analyst","start_year":2022,"end_year":2025,"logo_url":null,"description":"Transaction analytics and credit scoring prototypes."},{"organization":"Financial Sector Deepening Tanzania","role":"Research Intern","start_year":2021,"end_year":2022,"logo_url":null,"description":"Supported the FinScope survey analysis."}]$$::jsonb,
  $$[{"institution":"University of Dar es Salaam","degree_or_course":"BSc Computer Science","start_year":2017,"end_year":2021,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Cheikh Tidiane Sarr (demo-cheikh-tidiane-sarr)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '7555a975-f2fe-5f78-9d7d-d8165e3dd015',
  NULL,
  $$Individual$$,
  $$demo-cheikh-tidiane-sarr$$,
  $$Cheikh Tidiane Sarr$$,
  $$Digital Governance & E-Procurement Architect | Public Sector Information Systems | Francophone Africa$$,
  $$Dakar, Senegal$$,
  $$senior$$,
  NULL,
  $$Senegalese citizen; contracts as an individual or through his SARL in Dakar. Free movement within ECOWAS/WAEMU.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 45)::text, 'until', NULL),
  now() - interval '13 days',
  $$https://i.pravatar.cc/150?u=demo-cheikh-tidiane-sarr$$,
  $$https://picsum.photos/seed/demo-cheikh-tidiane-sarr/800/200$$,
  $$Cheikh Tidiane Sarr has spent nineteen years building digital governance systems for governments in Francophone Africa. He was technical director of Senegal's state information technology agency, where he oversaw the government data centre, the first e-procurement pilot and the interoperability platform linking treasury and tax systems. As a consultant he has written e-procurement requirements and solution architectures for Senegal, Mali and Guinea, supervised software vendors, and led change management for procurement officers moving from paper to online tenders. He is strong on database management and cloud hosting choices for sovereign data, and on the public procurement rules that the systems must enforce. He works in French and Wolof, and in English with development bank teams.$$,
  $$[{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"primary","level":"item"},{"name":"Citizen Engagement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Database Management","tier":"primary","level":"item"},{"name":"Change Management","tier":"primary","level":"item"},{"name":"Cloud Architecture","tier":"secondary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"TOGAF 9 Certified","issuing_organization":"The Open Group","year":2015,"credential_id_or_url":null},{"name":"PMP","issuing_organization":"Project Management Institute","year":2012,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$French$$, $$Wolof$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Digital Governance Architect","start_year":2018,"end_year":null,"logo_url":null,"description":"E-procurement and interoperability design for governments in West Africa."},{"organization":"Agence de l'Informatique de l'État, Senegal","role":"Technical Director","start_year":2010,"end_year":2018,"logo_url":null,"description":"Oversaw the government data centre, interoperability platform and e-procurement pilot."},{"organization":"Sonatel","role":"Systems Engineer","start_year":2006,"end_year":2010,"logo_url":null,"description":"Database and network engineering."}]$$::jsonb,
  $$[{"institution":"École Supérieure Polytechnique de Dakar","degree_or_course":"Diplôme d'Ingénieur, Génie Informatique","start_year":2001,"end_year":2006,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Teranga Digital Conseil (demo-teranga-digital-conseil)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '2977a406-80c6-56df-a644-aaa3d63bcacb',
  NULL,
  $$Small Firm$$,
  $$demo-teranga-digital-conseil$$,
  $$Teranga Digital Conseil$$,
  $$GovTech Firm | E-Procurement, Web Platforms & Cloud for Public Administrations | Senegal & West Africa$$,
  $$Dakar, Senegal$$,
  NULL,
  2014,
  $$Registered in Senegal (SARL, NINEA registered); contracts as a firm and partners with Ivorian firms for in-country presence in Abidjan.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '6 days',
  $$https://i.pravatar.cc/150?u=demo-teranga-digital-conseil$$,
  $$https://picsum.photos/seed/demo-teranga-digital-conseil/800/200$$,
  $$Teranga Digital Conseil is a Dakar govtech firm of eighteen engineers and consultants founded in 2014. It designs, builds and runs digital governance platforms for public administrations in Senegal, Mauritania, Mali and Côte d'Ivoire, including e-procurement modules, supplier registries, online payments and document exchange. The team covers web development, mobile app development, database management, cloud architecture and cybersecurity, and has a dedicated change management unit that trains civil servants and suppliers. Teranga works in French for government clients and has delivered projects financed by the World Bank, the African Development Bank and the European Union.$$,
  $$[{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Web Development","tier":"primary","level":"item"},{"name":"Cloud Architecture","tier":"primary","level":"item"},{"name":"Database Management","tier":"secondary","level":"item"},{"name":"Cybersecurity","tier":"secondary","level":"item"},{"name":"Mobile App Development","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO/IEC 27001 Information Security Management","issuing_organization":"Bureau Veritas","year":2022,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$French$$, $$Wolof$$, $$English$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Ndèye Astou Faye (demo-ndeye-astou-faye)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'b183f7f7-ff54-5b98-acb7-c2055190df9c',
  NULL,
  $$Individual$$,
  $$demo-ndeye-astou-faye$$,
  $$Ndèye Astou Faye$$,
  $$Gender & GBV Specialist | Women's Rights Programmes, Training | Senegal & the Sahel$$,
  $$Dakar, Senegal$$,
  $$mid_career$$,
  NULL,
  $$Senegalese citizen; contracts as an individual consultant.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '19 days',
  $$https://i.pravatar.cc/150?u=demo-ndeye-astou-faye$$,
  $$https://picsum.photos/seed/demo-ndeye-astou-faye/800/200$$,
  $$Ndèye Astou Faye is a gender specialist with ten years of experience on gender-based violence prevention and women's rights in Senegal, Mali and Niger. She designs gender mainstreaming strategies for programmes, runs qualitative research with survivors and community leaders using trauma-informed methods, and trains health, police and justice staff on referral pathways. She has worked with UN Women, UNFPA and Senegalese women's organizations, and has supported the national gender strategy's monitoring framework. Ndèye Astou facilitates workshops in French and Wolof and is an experienced trainer of trainers.$$,
  $$[{"name":"Gender-Based Violence","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"primary","level":"item"},{"name":"Social Protection","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Workshop Facilitation","tier":"secondary","level":"item"},{"name":"Training of Trainers","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$Wolof$$, $$English$$]::text[],
  $$[{"organization":"UN Women Senegal","role":"GBV Programme Analyst","start_year":2019,"end_year":2024,"logo_url":"https://cdn.brandfetch.io/unwomen.org","description":"Supported GBV prevention and referral programmes in Senegal and Mali."},{"organization":"Association des Juristes Sénégalaises","role":"Programme Officer","start_year":2015,"end_year":2019,"logo_url":null,"description":"Ran legal aid and awareness programmes for women."}]$$::jsonb,
  $$[{"institution":"Université Cheikh Anta Diop","degree_or_course":"Master en Sociologie","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Akwaba GovTech Partners (demo-akwaba-govtech-partners)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'ad8626d4-048e-5512-80af-5db3437cc839',
  NULL,
  $$Large Firm$$,
  $$demo-akwaba-govtech-partners$$,
  $$Akwaba GovTech Partners$$,
  $$Digital Government & E-Procurement Firm | Architecture, Platforms, Change Management | Francophone Africa$$,
  $$Abidjan, Côte d'Ivoire$$,
  NULL,
  2008,
  $$Registered in Côte d'Ivoire (SA) with subsidiaries in Dakar, Ouagadougou and Douala. Contracts as a firm; eligible under World Bank and AfDB procurement rules.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '21 days',
  $$https://i.pravatar.cc/150?u=demo-akwaba-govtech-partners$$,
  $$https://picsum.photos/seed/demo-akwaba-govtech-partners/800/200$$,
  $$Akwaba GovTech Partners is an Abidjan-headquartered digital government firm of 140 staff, with offices in Dakar, Ouagadougou and Douala. Since 2008 it has delivered e-procurement systems, treasury and tax interoperability, digital identity integration and online public services for governments across Francophone Africa. Its teams cover public procurement and legal analysis, solution architecture, web development, database management, cloud architecture and cybersecurity, and a change management practice that has trained more than 6,000 civil servants through training of trainers programmes. Akwaba also advises on open data publication of procurement information to support anti-corruption reforms and public-private partnerships for government data centres.$$,
  $$[{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"primary","level":"item"},{"name":"Anti-Corruption","tier":"secondary","level":"item"},{"name":"Public-Private Partnerships","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Web Development","tier":"primary","level":"item"},{"name":"Database Management","tier":"primary","level":"item"},{"name":"Cloud Architecture","tier":"secondary","level":"item"},{"name":"Cybersecurity","tier":"secondary","level":"item"},{"name":"Change Management","tier":"secondary","level":"item"},{"name":"Training of Trainers","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"AFNOR Certification","year":2018,"credential_id_or_url":null},{"name":"ISO/IEC 27001 Information Security Management","issuing_organization":"AFNOR Certification","year":2021,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$French$$, $$English$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Lagune Data Services (demo-lagune-data-services)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'd9c708c0-19ae-5c65-9903-fe47e7709fe2',
  NULL,
  $$Small Firm$$,
  $$demo-lagune-data-services$$,
  $$Lagune Data Services$$,
  $$Digital Services Firm | Web Platforms & Databases for Public Administrations | Côte d'Ivoire$$,
  $$Abidjan, Côte d'Ivoire$$,
  NULL,
  2017,
  $$Registered in Côte d'Ivoire (SARL); contracts as a firm.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '5 days',
  $$https://i.pravatar.cc/150?u=demo-lagune-data-services$$,
  $$https://picsum.photos/seed/demo-lagune-data-services/800/200$$,
  $$Lagune Data Services is an Abidjan-based digital services firm founded in 2017 by engineers who previously built information systems for Ivorian ministries. Its team of eleven designs and builds web platforms and databases for public administrations in Côte d'Ivoire, Senegal and Burkina Faso, with a focus on digital governance projects such as procurement portals, civil registry systems and online permit applications. The firm handles requirements analysis, web development, database design and migration, hosting on government and cloud infrastructure, and training of trainers so civil servants can run the systems themselves. All of its work is delivered in French.$$,
  $$[{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Database Management","tier":"primary","level":"item"},{"name":"Web Development","tier":"primary","level":"item"},{"name":"Cloud Architecture","tier":"secondary","level":"item"},{"name":"Training of Trainers","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$English$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Plateau Digital Solutions (demo-plateau-digital-solutions)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '6f12e0ec-7f5a-582a-83bc-e99e40d8c209',
  NULL,
  $$Small Firm$$,
  $$demo-plateau-digital-solutions$$,
  $$Plateau Digital Solutions$$,
  $$Digital Services Firm | Web Platforms & Databases for Public Administrations | Côte d'Ivoire$$,
  $$Abidjan, Côte d'Ivoire$$,
  NULL,
  2017,
  $$Registered in Côte d'Ivoire (SARL); contracts as a firm.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '48 days',
  $$https://i.pravatar.cc/150?u=demo-plateau-digital-solutions$$,
  $$https://picsum.photos/seed/demo-plateau-digital-solutions/800/200$$,
  $$Plateau Digital Solutions is an Abidjan-based digital services firm founded in 2017 by engineers who previously built information systems for Ivorian ministries. Its team of eleven designs and builds web platforms and databases for public administrations in Côte d'Ivoire, Senegal and Burkina Faso, with a focus on digital governance projects such as procurement portals, civil registry systems and online permit applications. The firm handles requirements analysis, web development, database design and migration, hosting on government and cloud infrastructure, and training of trainers so civil servants can run the systems themselves. All of its work is delivered in French.$$,
  $$[{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Database Management","tier":"primary","level":"item"},{"name":"Web Development","tier":"primary","level":"item"},{"name":"Cloud Architecture","tier":"secondary","level":"item"},{"name":"Training of Trainers","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$English$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Boureima Ouédraogo (demo-boureima-ouedraogo)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '241a438d-5451-528f-9d91-c26774ea5b18',
  NULL,
  $$Individual$$,
  $$demo-boureima-ouedraogo$$,
  $$Boureima Ouédraogo$$,
  $$Public Sector IT & Digital Government Consultant | Information Systems | Burkina Faso & Sahel$$,
  $$Ouagadougou, Burkina Faso$$,
  $$mid_career$$,
  NULL,
  $$Burkinabè citizen; contracts as an individual consultant. Free movement within ECOWAS/WAEMU.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 45)::text, 'until', NULL),
  now() - interval '13 days',
  $$https://i.pravatar.cc/150?u=demo-boureima-ouedraogo$$,
  $$https://picsum.photos/seed/demo-boureima-ouedraogo/800/200$$,
  $$Boureima Ouédraogo is a public sector IT consultant with twelve years of experience building digital governance systems in Burkina Faso, Niger and Mali. He has worked on e-procurement pilots, supplier registries and interoperability between treasury and tax systems, writing requirements, supervising software vendors and managing database migration from legacy systems. He also leads change management for civil servants moving from paper to online processes, including training of trainers in French. His recent work includes hosting decisions for government platforms on national data centres and cloud services, and the public procurement rules those platforms must apply.$$,
  $$[{"name":"Governance & Institutional","tier":"primary","level":"category"}]$$::jsonb,
  $$[{"name":"Digital & IT Services","tier":"primary","level":"category"},{"name":"Strategic & Operations","tier":"secondary","level":"category"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$Mooré$$, $$Fula$$]::text[],
  $$[{"organization":"Independent consultant","role":"Digital Government Consultant","start_year":2019,"end_year":null,"logo_url":null,"description":"Information systems assignments for Sahel governments and development partners."},{"organization":"Agence Nationale de Promotion des TIC, Burkina Faso","role":"Project Manager","start_year":2013,"end_year":2019,"logo_url":null,"description":"Managed e-government projects including the e-procurement pilot."}]$$::jsonb,
  $$[{"institution":"Université Joseph Ki-Zerbo","degree_or_course":"Master en Informatique","start_year":2010,"end_year":2012,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Kivi Digital Government Advisory (demo-kivi-digital-government-advisory)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '22fba599-ecf3-5ab6-9c44-92ad304572f7',
  NULL,
  $$Small Firm$$,
  $$demo-kivi-digital-government-advisory$$,
  $$Kivi Digital Government Advisory$$,
  $$Digital Government Advisory | E-Procurement, Interoperability & Cybersecurity | Europe, Africa & Central Asia$$,
  $$Tallinn, Estonia$$,
  NULL,
  2013,
  $$Registered in Estonia (OÜ); EU firm eligible for World Bank, AfDB and EU-funded contracts. Key experts travel on EU passports.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '9 days',
  $$https://i.pravatar.cc/150?u=demo-kivi-digital-government-advisory$$,
  $$https://picsum.photos/seed/demo-kivi-digital-government-advisory/800/200$$,
  $$Kivi Digital Government Advisory is a Tallinn firm of fifteen specialists founded in 2013 by former architects of Estonia's e-government and e-procurement systems. It advises governments on digital governance strategy, e-procurement, interoperability platforms and cybersecurity, and has worked in Ukraine, Moldova, Georgia, Kyrgyzstan, Benin, Senegal and Rwanda. The team covers public procurement process redesign, cloud architecture for sovereign data, database management, web development oversight and change management. It has a Francophone Africa practice with French-speaking architects and has supported procurement reform linked to anti-corruption programmes.$$,
  $$[{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"primary","level":"item"},{"name":"Anti-Corruption","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Cloud Architecture","tier":"primary","level":"item"},{"name":"Cybersecurity","tier":"primary","level":"item"},{"name":"Web Development","tier":"secondary","level":"item"},{"name":"Database Management","tier":"secondary","level":"item"},{"name":"Change Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Estonian$$, $$French$$, $$Russian$$]::text[],
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Portfolio items for this part: replace wholesale.
DELETE FROM portfolio_items WHERE profile_id IN (SELECT id FROM profiles WHERE handle IN ($$demo-integra-gobernanza$$, $$demo-carolina-rojas-villalobos$$, $$demo-saad-ahmed-malik$$, $$demo-rania-haddad$$, $$demo-omar-khalil-mansour$$, $$demo-layla-nasser-odeh$$, $$demo-levant-field-research-collective$$, $$demo-dilini-wickramasinghe$$, $$demo-joseph-ssemakula$$, $$demo-rowena-bautista-lacson$$, $$demo-joaquin-reyes-manalo$$, $$demo-siti-rahmawati-nugroho$$, $$demo-rizky-pratama-wibowo$$, $$demo-dimas-arya-saputra$$, $$demo-nguyen-thu-ha$$, $$demo-archipelago-rural-finance-partners$$, $$demo-neema-mwakyusa$$, $$demo-cheikh-tidiane-sarr$$, $$demo-teranga-digital-conseil$$, $$demo-ndeye-astou-faye$$, $$demo-akwaba-govtech-partners$$, $$demo-lagune-data-services$$, $$demo-plateau-digital-solutions$$, $$demo-boureima-ouedraogo$$, $$demo-kivi-digital-government-advisory$$));

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-integra-gobernanza$$), $$Procurement Integrity Risk Assessment, Northern Triangle$$, $$Inter-American Development Bank$$, 2023, 2024, $$Lead Firm$$, $$Mapped corruption risks across the procurement cycle in Guatemala, Honduras and El Salvador and facilitated national validation workshops with procurement authorities and auditors.$$, $$Produced a regional reform roadmap; two countries included its recommendations in procurement law amendments.$$, $$https://picsum.photos/seed/demo-integra-gobernanza-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-integra-gobernanza-portfolio-1-img1/900/600","caption":"Regional validation workshop"},{"url":"https://picsum.photos/seed/demo-integra-gobernanza-portfolio-1-img2/900/600","caption":"Risk mapping session"}]$$::jsonb, $$[{"label":"Roadmap summary","url":"https://example.org/integra-northern-triangle"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-integra-gobernanza$$), $$National Survey on Trust and Corruption, Mexico$$, $$Open Society Foundations$$, 2019, 2020, $$Research Firm$$, $$Designed and ran a national survey on experiences of corruption and trust in public institutions, with policy analysis for state governments.$$, $$Survey results informed state anti-corruption programmes in five states.$$, $$https://picsum.photos/seed/demo-integra-gobernanza-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-integra-gobernanza-portfolio-2-img1/900/600","caption":"Survey results launch"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-carolina-rojas-villalobos$$), $$Public Procurement Audit Reports, Guatemala and Honduras$$, $$Regional Transparency Programme (EU-funded)$$, 2022, 2024, $$Co-author and Analyst$$, $$Co-authored the anti-corruption and public procurement audit reports of a regional transparency programme, analysing red flags in contract data with the audit teams and drafting the findings on direct awards and contract amendments.$$, $$Reports were presented to both legislatures and led to new rules requiring publication of contract amendments.$$, $$https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-1-img1/900/600","caption":"Report launch in Tegucigalpa"},{"url":"https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-1-img2/900/600","caption":"Editing session with the audit team"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-carolina-rojas-villalobos$$), $$Citizen Monitoring Guide for Public Works Contracts$$, $$CoST Guatemala$$, 2020, 2021, $$Lead Writer$$, $$Wrote the guide community committees use for citizen engagement in monitoring public works contracts, including how to read procurement documents and file information requests.$$, $$Guide used to train more than 300 community monitors.$$, $$https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-2-img1/900/600","caption":"Community monitor training"}]$$::jsonb, $$[]$$::jsonb, 2),
  ((SELECT id FROM profiles WHERE handle = $$demo-carolina-rojas-villalobos$$), $$Regional Investment Climate Report$$, $$SIECA$$, 2018, 2019, $$Editor$$, $$Edited and co-wrote a regional report on trade facilitation and investment climate reforms in Central America.$$, $$Published in Spanish and English and presented to regional economy ministers.$$, $$https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-3/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-carolina-rojas-villalobos-portfolio-3-img1/900/600","caption":"Report cover design"}]$$::jsonb, $$[]$$::jsonb, 3);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-saad-ahmed-malik$$), $$Procurement Complaints and Debarment Study, Pakistan$$, $$World Bank$$, 2021, 2022, $$Lead Researcher$$, $$Analysed procurement complaints and debarment decisions across four provinces and recommended reforms to the complaints mechanism.$$, $$Two provinces revised their complaint-handling rules based on the study.$$, $$https://picsum.photos/seed/demo-saad-ahmed-malik-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-saad-ahmed-malik-portfolio-1-img1/900/600","caption":"Consultation with procurement officers"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-saad-ahmed-malik$$), $$Court Case Management Reform, Khyber Pakhtunkhwa$$, $$UNDP Pakistan$$, 2019, 2021, $$Justice Reform Advisor$$, $$Supported automation of case management in district courts and monitored case backlog indicators.$$, $$Average case processing time in pilot districts fell by a fifth.$$, $$https://picsum.photos/seed/demo-saad-ahmed-malik-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-saad-ahmed-malik-portfolio-2-img1/900/600","caption":"Case management training for court staff"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rania-haddad$$), $$Social Cohesion Assessment, North Lebanon and Bekaa$$, $$UNDP Lebanon$$, 2023, 2024, $$Research Lead$$, $$Designed a mixed-methods assessment of tension between refugee and host communities in 12 municipalities, with a 1,200-household survey and 40 focus groups.$$, $$Findings reshaped municipal service projects toward shared water and waste services; tension scores fell in follow-up monitoring.$$, $$https://picsum.photos/seed/demo-rania-haddad-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rania-haddad-portfolio-1-img1/900/600","caption":"Focus group with host community youth in Akkar"},{"url":"https://picsum.photos/seed/demo-rania-haddad-portfolio-1-img2/900/600","caption":"Municipal dialogue session in Zahle"}]$$::jsonb, $$[{"label":"Assessment brief","url":"https://example.org/lebanon-social-cohesion-2024"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rania-haddad$$), $$Conflict-Sensitivity Review of a Livelihoods Programme, Jordan$$, $$Danish Refugee Council$$, 2021, 2022, $$Conflict Sensitivity Advisor$$, $$Reviewed targeting and grant criteria of a refugee livelihoods programme for unintended effects on host-community relations.$$, $$Targeting rules revised to include vulnerable Jordanian households; complaints about unfairness dropped.$$, $$https://picsum.photos/seed/demo-rania-haddad-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rania-haddad-portfolio-2-img1/900/600","caption":"Key informant interview in Mafraq"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-omar-khalil-mansour$$), $$Labour Market and Value Chain Assessment, Northern Jordan$$, $$Mercy Corps$$, 2019, 2020, $$Assessment Lead$$, $$Led market research in Irbid, Mafraq and Zarqa covering labour demand, food processing and garment value chains, and constraints facing home-based businesses run by refugee and Jordanian women.$$, $$Identified four value chains that became the focus of a three-year enterprise programme supporting 1,800 small businesses.$$, $$https://picsum.photos/seed/demo-omar-khalil-mansour-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-omar-khalil-mansour-portfolio-1-img1/900/600","caption":"Interview with a home-based food producer in Irbid"},{"url":"https://picsum.photos/seed/demo-omar-khalil-mansour-portfolio-1-img2/900/600","caption":"Market mapping workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-omar-khalil-mansour$$), $$Home-Based Business Registration Support, Jordan$$, $$UNHCR Jordan$$, 2022, 2024, $$Livelihoods Consultant$$, $$Worked with municipalities and the Ministry of Labour to simplify home-based business registration for refugees and monitored SME support outcomes through a household survey.$$, $$More than 2,000 refugee-run home-based businesses registered in two years.$$, $$https://picsum.photos/seed/demo-omar-khalil-mansour-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-omar-khalil-mansour-portfolio-2-img1/900/600","caption":"Registration help desk in Zarqa"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-layla-nasser-odeh$$), $$Labour Market and Value Chain Assessment, Northern Jordan$$, $$UNHCR Jordan$$, 2018, 2019, $$Assessment Lead$$, $$Led market research in Irbid, Mafraq and Zarqa covering labour demand, food processing and garment value chains, and constraints facing home-based businesses run by refugee and Jordanian women.$$, $$Identified four value chains that became the focus of a three-year enterprise programme supporting 1,800 small businesses.$$, $$https://picsum.photos/seed/demo-layla-nasser-odeh-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-layla-nasser-odeh-portfolio-1-img1/900/600","caption":"Interview with a home-based food producer in Mafraq"},{"url":"https://picsum.photos/seed/demo-layla-nasser-odeh-portfolio-1-img2/900/600","caption":"Market mapping workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-layla-nasser-odeh$$), $$Access to Finance for Refugee-Led Enterprises, Jordan$$, $$Mercy Corps$$, 2021, 2023, $$Programme Advisor$$, $$Worked with municipalities and microfinance institutions to open credit to refugee-run home-based businesses and monitored SME support outcomes through qualitative research.$$, $$More than 2,000 refugee-run home-based businesses accessed credit or grants in two years.$$, $$https://picsum.photos/seed/demo-layla-nasser-odeh-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-layla-nasser-odeh-portfolio-2-img1/900/600","caption":"Microfinance information session in Zarqa"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-levant-field-research-collective$$), $$Livelihoods and Debt Survey of Syrian Refugees, Jordan$$, $$UNHCR Jordan$$, 2022, 2023, $$Research Firm$$, $$Designed and fielded a 2,000-household survey of refugee livelihoods, debt and coping strategies in camps and host communities, with follow-up focus groups.$$, $$Data fed directly into UNHCR's vulnerability assessment framework and cash targeting model.$$, $$https://picsum.photos/seed/demo-levant-field-research-collective-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-levant-field-research-collective-portfolio-1-img1/900/600","caption":"Enumerator briefing in Azraq camp"},{"url":"https://picsum.photos/seed/demo-levant-field-research-collective-portfolio-1-img2/900/600","caption":"Data quality review"},{"url":"https://picsum.photos/seed/demo-levant-field-research-collective-portfolio-1-img3/900/600","caption":"Focus group with women in Mafraq"}]$$::jsonb, $$[{"label":"Survey factsheet","url":"https://example.org/lfrc-jordan-debt-survey"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-levant-field-research-collective$$), $$Market Systems and Social Cohesion Study, Tripoli and Akkar$$, $$Lebanon Livelihoods Consortium$$, 2021, 2021, $$Lead Researcher$$, $$Combined market research on agriculture and construction labour with a social cohesion survey in North Lebanon.$$, $$Consortium shifted cash-for-work toward shared municipal infrastructure, reducing reported competition for jobs.$$, $$https://picsum.photos/seed/demo-levant-field-research-collective-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-levant-field-research-collective-portfolio-2-img1/900/600","caption":"Labour market interviews in Tripoli"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-dilini-wickramasinghe$$), $$National Reconciliation Barometer, Qualitative Component$$, $$UNDP Sri Lanka$$, 2020, 2021, $$Qualitative Research Lead$$, $$Led 60 focus groups across all provinces on trust, memory and inter-community relations to complement a national survey.$$, $$Findings framed the government's reconciliation action plan and district dialogue programmes.$$, $$https://picsum.photos/seed/demo-dilini-wickramasinghe-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-dilini-wickramasinghe-portfolio-1-img1/900/600","caption":"Focus group in Jaffna"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-dilini-wickramasinghe$$), $$Livelihoods Recovery Evaluation for Returnee Families$$, $$European Union$$, 2017, 2018, $$Evaluation Team Leader$$, $$Evaluated livelihoods and housing support for displaced families returning to the Northern Province.$$, $$Evaluation led to a second phase focused on women-headed households.$$, $$https://picsum.photos/seed/demo-dilini-wickramasinghe-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-dilini-wickramasinghe-portfolio-2-img1/900/600","caption":"Returnee housing site visit"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-joseph-ssemakula$$), $$Refugee and Host Community Self-Reliance Programme, West Nile$$, $$European Union$$, 2019, 2023, $$Programme Manager$$, $$Managed a programme supporting agricultural livelihoods and savings groups for refugees and host communities in four settlements, with peace committees to resolve land disputes.$$, $$Reached 24,000 households; land disputes reported to peace committees resolved in 80% of cases.$$, $$https://picsum.photos/seed/demo-joseph-ssemakula-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-joseph-ssemakula-portfolio-1-img1/900/600","caption":"Savings group meeting in Bidibidi"},{"url":"https://picsum.photos/seed/demo-joseph-ssemakula-portfolio-1-img2/900/600","caption":"Peace committee session"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-joseph-ssemakula$$), $$Emergency Food Assistance, Upper Nile$$, $$World Food Programme$$, 2014, 2017, $$Programme Manager$$, $$Managed general food distributions and nutrition support for displaced populations in Upper Nile State.$$, $$Maintained distributions to 120,000 people through two rainy seasons.$$, $$https://picsum.photos/seed/demo-joseph-ssemakula-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-joseph-ssemakula-portfolio-2-img1/900/600","caption":"Food distribution site"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rowena-bautista-lacson$$), $$Value-Chain Finance Products for Coconut and Coffee, Mindanao$$, $$IFAD$$, 2022, 2024, $$Product Design Lead$$, $$Led market research and product design for three rural banks, including seasonal loans repaid through off-takers and warehouse receipt financing, with financial modeling of costs and risk for each bank.$$, $$Two products piloted with 3,500 farmers; repayment above 95% in the first season.$$, $$https://picsum.photos/seed/demo-rowena-bautista-lacson-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rowena-bautista-lacson-portfolio-1-img1/900/600","caption":"Coffee aggregator interview in Bukidnon"},{"url":"https://picsum.photos/seed/demo-rowena-bautista-lacson-portfolio-1-img2/900/600","caption":"Product design workshop with rural bank staff"}]$$::jsonb, $$[{"label":"Pilot brief","url":"https://example.org/mindanao-value-chain-finance"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rowena-bautista-lacson$$), $$Agricultural Finance Market Assessment, Eastern Indonesia$$, $$Asian Development Bank$$, 2019, 2020, $$Team Leader$$, $$Assessed demand and supply of agricultural credit and insurance across maize and seaweed value chains in Nusa Tenggara, including a 1,000-household survey.$$, $$Assessment shaped the agricultural finance component of an ADB rural development loan.$$, $$https://picsum.photos/seed/demo-rowena-bautista-lacson-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rowena-bautista-lacson-portfolio-2-img1/900/600","caption":"Seaweed farmers in Nusa Tenggara"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-joaquin-reyes-manalo$$), $$Agricultural Credit Guarantee Design, Philippines$$, $$Asian Development Bank$$, 2021, 2023, $$Financial Modeling Lead$$, $$Built the financial model for a partial credit guarantee for agricultural loans, testing claim rates, pricing and fiscal exposure.$$, $$Guarantee approved as part of an ADB policy-based loan; 14 rural banks enrolled in year one.$$, $$https://picsum.photos/seed/demo-joaquin-reyes-manalo-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-joaquin-reyes-manalo-portfolio-1-img1/900/600","caption":"Model review session with the guarantee agency"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-joaquin-reyes-manalo$$), $$Digital Payments for Farmers Diagnostic, Indonesia$$, $$Asian Development Bank$$, 2020, 2021, $$Financial Inclusion Specialist$$, $$Assessed use of digital financial services by farmer groups and the regulatory barriers for agent networks in rural areas.$$, $$Diagnostic informed the digital finance component of a rural development project.$$, $$https://picsum.photos/seed/demo-joaquin-reyes-manalo-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-joaquin-reyes-manalo-portfolio-2-img1/900/600","caption":"Agent banking outlet in East Java"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-siti-rahmawati-nugroho$$), $$Coffee and Cocoa Value-Chain Finance Study, Sulawesi and East Java$$, $$IFAD$$, 2021, 2022, $$Lead Consultant$$, $$Led market research on financing gaps across coffee and cocoa value chains, with a survey of 800 farm households and interviews with off-takers and lenders.$$, $$Study led to a value-chain finance window in IFAD's rural development programme reaching 6,000 farmers.$$, $$https://picsum.photos/seed/demo-siti-rahmawati-nugroho-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-siti-rahmawati-nugroho-portfolio-1-img1/900/600","caption":"Cocoa farmer interview in Sulawesi"},{"url":"https://picsum.photos/seed/demo-siti-rahmawati-nugroho-portfolio-1-img2/900/600","caption":"Off-taker warehouse visit"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-siti-rahmawati-nugroho$$), $$Maize Value Chain Development Project Design$$, $$Asian Development Bank$$, 2016, 2018, $$Project Officer$$, $$Prepared the agribusiness and finance components of a maize value chain project, including financial modeling of contract farming arrangements.$$, $$Project approved with a $120 million financing package.$$, $$https://picsum.photos/seed/demo-siti-rahmawati-nugroho-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-siti-rahmawati-nugroho-portfolio-2-img1/900/600","caption":"Maize aggregation centre"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rizky-pratama-wibowo$$), $$Smallholder Credit Demand Survey, Nusa Tenggara$$, $$MicroSave Consulting$$, 2023, 2024, $$Market Research Analyst$$, $$Designed and analysed a demand-side survey of 900 farm households in maize and seaweed value chains, with interviews of rural banks and cooperatives on lending practices.$$, $$Survey identified an unmet seasonal credit need and led two partner institutions to pilot harvest-linked repayment schedules.$$, $$https://picsum.photos/seed/demo-rizky-pratama-wibowo-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rizky-pratama-wibowo-portfolio-1-img1/900/600","caption":"Survey enumeration in a seaweed farming village"},{"url":"https://picsum.photos/seed/demo-rizky-pratama-wibowo-portfolio-1-img2/900/600","caption":"Interview with a cooperative manager"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rizky-pratama-wibowo$$), $$Women Farmers' Access to Credit, Mindanao$$, $$MicroSave Consulting$$, 2021, 2022, $$Research Analyst$$, $$Combined survey data and focus groups to analyse barriers to credit faced by women coffee farmers and women-led agri-enterprises.$$, $$Recommendations on collateral alternatives were adopted in a partner bank's lending policy.$$, $$https://picsum.photos/seed/demo-rizky-pratama-wibowo-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rizky-pratama-wibowo-portfolio-2-img1/900/600","caption":"Focus group with women coffee farmers"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-dimas-arya-saputra$$), $$Smallholder Credit Demand Survey, Nusa Tenggara$$, $$Mercy Corps$$, 2023, 2024, $$Market Research Analyst$$, $$Designed and analysed a demand-side survey of 900 farm households in maize and seaweed value chains, with interviews of rural banks and cooperatives on lending practices.$$, $$Survey identified an unmet seasonal credit need and led two partner institutions to pilot harvest-linked repayment schedules.$$, $$https://picsum.photos/seed/demo-dimas-arya-saputra-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-dimas-arya-saputra-portfolio-1-img1/900/600","caption":"Survey enumeration in a seaweed farming village"},{"url":"https://picsum.photos/seed/demo-dimas-arya-saputra-portfolio-1-img2/900/600","caption":"Interview with a cooperative manager"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-dimas-arya-saputra$$), $$Women Farmers' Access to Credit, Mindanao$$, $$Mercy Corps$$, 2021, 2022, $$Research Analyst$$, $$Combined survey data and focus groups to analyse barriers to credit faced by women coffee farmers and women-led agri-enterprises.$$, $$Recommendations on collateral alternatives were adopted in a partner bank's lending policy.$$, $$https://picsum.photos/seed/demo-dimas-arya-saputra-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-dimas-arya-saputra-portfolio-2-img1/900/600","caption":"Focus group with women coffee farmers"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-nguyen-thu-ha$$), $$Credit Needs Assessment for Coffee Cooperatives, Central Highlands$$, $$IFAD$$, 2021, 2022, $$Lead Researcher$$, $$Ran market research with 600 coffee-farming households and 12 cooperatives on seasonal credit needs, and built a financial modeling tool for lenders to price harvest-linked loans.$$, $$Two agricultural lenders adopted the pricing tool; cooperative members received seasonal credit for the first time.$$, $$https://picsum.photos/seed/demo-nguyen-thu-ha-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-nguyen-thu-ha-portfolio-1-img1/900/600","caption":"Cooperative meeting in Dak Lak"},{"url":"https://picsum.photos/seed/demo-nguyen-thu-ha-portfolio-1-img2/900/600","caption":"Loan pricing tool training"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-nguyen-thu-ha$$), $$Supplier Finance for Seaweed Farmers, Philippines and Indonesia$$, $$Impact investor consortium$$, 2023, 2024, $$Value Chain Advisor$$, $$Designed supplier finance schemes through which seaweed processors advance inputs to farmers, with financial modeling of processor cash flow and farmer repayment, to expand financial inclusion in coastal communities.$$, $$Scheme launched with two processors serving 1,400 seaweed farmers.$$, $$https://picsum.photos/seed/demo-nguyen-thu-ha-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-nguyen-thu-ha-portfolio-2-img1/900/600","caption":"Seaweed drying in Palawan"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-archipelago-rural-finance-partners$$), $$Agricultural Finance Facility Design, Philippines and Indonesia$$, $$Asian Development Bank$$, 2020, 2022, $$Lead Firm$$, $$Designed a regional facility for lending to smallholders and agri-SMEs, including demand surveys of 2,000 farm households, assessment of partner institutions and financial modeling of the facility.$$, $$Facility approved with co-financing from IFAD; 11 partner institutions onboarded.$$, $$https://picsum.photos/seed/demo-archipelago-rural-finance-partners-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-archipelago-rural-finance-partners-portfolio-1-img1/900/600","caption":"Partner institution assessment in Cagayan de Oro"},{"url":"https://picsum.photos/seed/demo-archipelago-rural-finance-partners-portfolio-1-img2/900/600","caption":"Farm household survey in East Java"}]$$::jsonb, $$[{"label":"Facility overview","url":"https://example.org/arfp-agri-finance-facility"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-archipelago-rural-finance-partners$$), $$Impact Evaluation of Digital Credit for Rice Farmers, Cambodia$$, $$IFC$$, 2017, 2019, $$Evaluation Partner$$, $$Randomized impact evaluation of a digital credit product for rice farmers offered through a microfinance institution.$$, $$Found higher input use and yields among borrowers; product scaled nationally.$$, $$https://picsum.photos/seed/demo-archipelago-rural-finance-partners-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-archipelago-rural-finance-partners-portfolio-2-img1/900/600","caption":"Rice farmers using mobile credit"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-neema-mwakyusa$$), $$Merchant Credit Scoring Prototype$$, $$Fintech start-up (Dar es Salaam)$$, 2023, 2024, $$Data Analyst$$, $$Built a credit scoring prototype for small merchants from mobile money transaction histories using Python.$$, $$Prototype supported a pilot of working-capital loans to 300 merchants.$$, $$https://picsum.photos/seed/demo-neema-mwakyusa-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-neema-mwakyusa-portfolio-1-img1/900/600","caption":"Credit scoring dashboard"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-neema-mwakyusa$$), $$Urban SME Savings and Mobile Wallet Study$$, $$Financial Sector Deepening Tanzania$$, 2021, 2022, $$Research Assistant$$, $$Supported market research on how urban SMEs use savings groups and mobile wallets in Dar es Salaam and Mwanza.$$, $$Findings presented to the central bank fintech working group.$$, $$https://picsum.photos/seed/demo-neema-mwakyusa-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-neema-mwakyusa-portfolio-2-img1/900/600","caption":"Interview with a market trader in Mwanza"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-cheikh-tidiane-sarr$$), $$E-Procurement Requirements and Architecture, Guinea$$, $$World Bank$$, 2022, 2023, $$Lead Architect$$, $$Defined functional requirements for e-tendering, e-evaluation and supplier registration, and prepared the solution architecture with database management, hosting and interoperability with treasury systems.$$, $$Architecture adopted for the national e-procurement tender; platform went live in three pilot ministries.$$, $$https://picsum.photos/seed/demo-cheikh-tidiane-sarr-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-cheikh-tidiane-sarr-portfolio-1-img1/900/600","caption":"Requirements workshop with procurement officers"},{"url":"https://picsum.photos/seed/demo-cheikh-tidiane-sarr-portfolio-1-img2/900/600","caption":"Architecture review in Conakry"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-cheikh-tidiane-sarr$$), $$Government Interoperability Platform, Senegal$$, $$Agence de l'Informatique de l'État$$, 2014, 2017, $$Technical Director$$, $$Led the design and roll-out of the platform connecting treasury, tax, customs and procurement systems.$$, $$Twelve government systems connected; supplier tax clearance became automatic in procurement.$$, $$https://picsum.photos/seed/demo-cheikh-tidiane-sarr-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-cheikh-tidiane-sarr-portfolio-2-img1/900/600","caption":"Government data centre"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-teranga-digital-conseil$$), $$E-Procurement Module and Supplier Registry, Mauritania$$, $$African Development Bank$$, 2021, 2023, $$Development Firm$$, $$Built the e-tendering module and supplier registry for the national procurement authority, with cloud hosting, cybersecurity hardening and training of trainers for procurement officers.$$, $$1,200 suppliers registered and 300 tenders run online in the first year.$$, $$https://picsum.photos/seed/demo-teranga-digital-conseil-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-teranga-digital-conseil-portfolio-1-img1/900/600","caption":"Supplier onboarding session in Nouakchott"},{"url":"https://picsum.photos/seed/demo-teranga-digital-conseil-portfolio-1-img2/900/600","caption":"Security testing of the platform"}]$$::jsonb, $$[{"label":"Project page","url":"https://example.org/teranga-mauritania-eprocurement"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-teranga-digital-conseil$$), $$Online Public Services Portal, Senegal$$, $$European Union$$, 2019, 2020, $$Development Firm$$, $$Developed a citizen services portal and mobile app for civil registry certificates with e-payment.$$, $$Portal handles 40,000 requests a month.$$, $$https://picsum.photos/seed/demo-teranga-digital-conseil-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-teranga-digital-conseil-portfolio-2-img1/900/600","caption":"Portal launch event"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-ndeye-astou-faye$$), $$GBV Referral Pathway Strengthening, Kolda and Sédhiou$$, $$UN Women$$, 2021, 2023, $$Programme Analyst$$, $$Mapped and strengthened referral pathways between health, police and justice services and trained frontline staff.$$, $$Referral times for survivors reduced; 400 frontline staff trained.$$, $$https://picsum.photos/seed/demo-ndeye-astou-faye-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-ndeye-astou-faye-portfolio-1-img1/900/600","caption":"Training of trainers in Kolda"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-ndeye-astou-faye$$), $$Gender Analysis for a Resilience Programme, Niger$$, $$Oxfam$$, 2019, 2019, $$Gender Consultant$$, $$Conducted qualitative research on women's roles in household resilience and drafted the programme's gender mainstreaming strategy.$$, $$Strategy adopted with women-specific targets for all programme components.$$, $$https://picsum.photos/seed/demo-ndeye-astou-faye-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-ndeye-astou-faye-portfolio-2-img1/900/600","caption":"Women's group discussion in Tillabéri"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-akwaba-govtech-partners$$), $$National E-Procurement Platform, Côte d'Ivoire$$, $$World Bank$$, 2019, 2022, $$Lead Firm$$, $$Designed the solution architecture and supervised web development and configuration of the national e-procurement platform, integrated with treasury and tax systems, with change management for procurement officers and suppliers.$$, $$Platform live in 28 ministries; 70% of national tenders now run online.$$, $$https://picsum.photos/seed/demo-akwaba-govtech-partners-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-akwaba-govtech-partners-portfolio-1-img1/900/600","caption":"Go-live in the Ministry of Economy"},{"url":"https://picsum.photos/seed/demo-akwaba-govtech-partners-portfolio-1-img2/900/600","caption":"Supplier training session"},{"url":"https://picsum.photos/seed/demo-akwaba-govtech-partners-portfolio-1-img3/900/600","caption":"Data centre migration"}]$$::jsonb, $$[{"label":"Programme overview","url":"https://example.org/akwaba-civ-eprocurement"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-akwaba-govtech-partners$$), $$Procurement Open Data Portal, Burkina Faso$$, $$African Development Bank$$, 2023, 2024, $$Lead Firm$$, $$Built an open data portal publishing procurement information in the Open Contracting Data Standard to support anti-corruption oversight.$$, $$All contract awards above the national threshold now published within 15 days.$$, $$https://picsum.photos/seed/demo-akwaba-govtech-partners-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-akwaba-govtech-partners-portfolio-2-img1/900/600","caption":"Open data portal demonstration"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-lagune-data-services$$), $$Online Business Permit Platform$$, $$Government of Côte d'Ivoire$$, 2022, 2023, $$Development Firm$$, $$Designed and built a web platform for online business permit applications, including database design, integration with the tax identification system, and hosting in the government data centre.$$, $$Average permit processing time fell from 21 to 6 days; 9,000 applications filed online in the first year.$$, $$https://picsum.photos/seed/demo-lagune-data-services-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lagune-data-services-portfolio-1-img1/900/600","caption":"Platform training for permit officers"},{"url":"https://picsum.photos/seed/demo-lagune-data-services-portfolio-1-img2/900/600","caption":"Database migration workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-lagune-data-services$$), $$Supplier Registry Database for a Regional Procurement Unit$$, $$Government of Côte d'Ivoire$$, 2020, 2021, $$Database Developer$$, $$Built the supplier registry database and web interface for a public procurement unit, with migration of legacy records and training of trainers for procurement staff.$$, $$Registry holds 4,500 verified suppliers and is used for every tender of the unit.$$, $$https://picsum.photos/seed/demo-lagune-data-services-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lagune-data-services-portfolio-2-img1/900/600","caption":"Supplier registration session"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-plateau-digital-solutions$$), $$Online Business Permit Platform$$, $$Government of Burkina Faso$$, 2022, 2023, $$Development Firm$$, $$Designed and built a web platform for online business permit applications, including database design, integration with the tax identification system, and hosting in the government data centre.$$, $$Average permit processing time fell from 21 to 6 days; 9,000 applications filed online in the first year.$$, $$https://picsum.photos/seed/demo-plateau-digital-solutions-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-plateau-digital-solutions-portfolio-1-img1/900/600","caption":"Platform training for permit officers"},{"url":"https://picsum.photos/seed/demo-plateau-digital-solutions-portfolio-1-img2/900/600","caption":"Database migration workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-plateau-digital-solutions$$), $$Supplier Registry Database for a Regional Procurement Unit$$, $$Government of Burkina Faso$$, 2020, 2021, $$Database Developer$$, $$Built the supplier registry database and web interface for a public procurement unit, with migration of legacy records and training of trainers for procurement staff.$$, $$Registry holds 4,500 verified suppliers and is used for every tender of the unit.$$, $$https://picsum.photos/seed/demo-plateau-digital-solutions-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-plateau-digital-solutions-portfolio-2-img1/900/600","caption":"Supplier registration session"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-boureima-ouedraogo$$), $$E-Procurement Pilot and Supplier Registry, Burkina Faso$$, $$Agence Nationale de Promotion des TIC$$, 2016, 2018, $$Project Manager$$, $$Managed the e-procurement pilot and supplier registry, including requirements, vendor supervision, database migration and training of trainers for procurement officers.$$, $$Pilot ran 120 tenders online across three ministries.$$, $$https://picsum.photos/seed/demo-boureima-ouedraogo-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-boureima-ouedraogo-portfolio-1-img1/900/600","caption":"Training of procurement officers in Ouagadougou"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-boureima-ouedraogo$$), $$Treasury and Tax Interoperability Study, Niger$$, $$World Bank$$, 2021, 2022, $$IT Consultant$$, $$Assessed interoperability between treasury, tax and procurement systems and recommended hosting on the national data centre or cloud services.$$, $$Recommendations included in the government's digital governance action plan.$$, $$https://picsum.photos/seed/demo-boureima-ouedraogo-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-boureima-ouedraogo-portfolio-2-img1/900/600","caption":"Systems mapping workshop in Niamey"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-kivi-digital-government-advisory$$), $$E-Procurement System Assessment and Roadmap, Benin$$, $$European Union$$, 2022, 2023, $$Lead Firm$$, $$Assessed the national e-procurement system and prepared a modernization roadmap covering cloud architecture, database management, cybersecurity and interoperability with the treasury.$$, $$Roadmap financed under an EU budget support programme; migration to the new platform under way.$$, $$https://picsum.photos/seed/demo-kivi-digital-government-advisory-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kivi-digital-government-advisory-portfolio-1-img1/900/600","caption":"Roadmap workshop in Cotonou"},{"url":"https://picsum.photos/seed/demo-kivi-digital-government-advisory-portfolio-1-img2/900/600","caption":"Cybersecurity assessment session"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-kivi-digital-government-advisory$$), $$Prozorro-Style Procurement Interoperability, Moldova$$, $$World Bank$$, 2019, 2021, $$Architecture Advisor$$, $$Advised on interoperability between the e-procurement system, company registry and treasury, and on cybersecurity requirements.$$, $$Automated supplier eligibility checks introduced for all tenders.$$, $$https://picsum.photos/seed/demo-kivi-digital-government-advisory-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kivi-digital-government-advisory-portfolio-2-img1/900/600","caption":"Architecture review in Chișinău"}]$$::jsonb, $$[]$$::jsonb, 2);

COMMIT;
