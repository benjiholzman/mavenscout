-- 007 (part 3 of 4): synthetic demo profiles — GENERATED, do not edit by hand.
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

-- Mai Abdel-Aziz Fawzy (demo-mai-abdel-aziz-fawzy)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '59e4a332-ed54-513b-84bd-be3126f24d22',
  NULL,
  $$Individual$$,
  $$demo-mai-abdel-aziz-fawzy$$,
  $$Mai Abdel-Aziz Fawzy$$,
  $$Circular Economy Specialist | Waste Value Chains & Market Research | Egypt$$,
  $$Cairo, Egypt$$,
  $$mid_career$$,
  NULL,
  $$Egyptian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 60)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '240 days',
  $$https://i.pravatar.cc/150?u=demo-mai-abdel-aziz-fawzy$$,
  $$https://picsum.photos/seed/demo-mai-abdel-aziz-fawzy/800/200$$,
  $$Mai Abdel-Aziz Fawzy works on the circular economy and waste value chains in Egypt. Over eight years she has conducted market research on recycled plastics, agricultural residues and construction waste, mapped reverse logistics and supply chains for recyclers, and estimated the climate mitigation benefits of diverting waste from landfills. She has designed surveys of informal waste collectors in Cairo and supported start-ups turning waste into products. Mai has worked with UNIDO, the EU and Egyptian business associations. She is fluent in Arabic and English and often bridges between recyclers, municipalities and investors.$$,
  $$[{"name":"Circular Economy","tier":"primary","level":"item"},{"name":"Climate Mitigation","tier":"secondary","level":"item"},{"name":"Logistics & Supply Chain","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Circular Economy Specialist","start_year":2021,"end_year":null,"logo_url":null,"description":"Market and value chain studies for recycling and waste."},{"organization":"UNIDO Egypt","role":"Project Associate","start_year":2017,"end_year":2021,"logo_url":null,"description":"Green industry and waste valorisation projects."}]$$::jsonb,
  $$[{"institution":"American University in Cairo","degree_or_course":"MSc Environmental Engineering","start_year":2014,"end_year":2016,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Hiba Osman Elfaki (demo-hiba-osman-elfaki)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'e9f12311-a907-520a-81a0-65b06cbb301b',
  NULL,
  $$Individual$$,
  $$demo-hiba-osman-elfaki$$,
  $$Hiba Osman Elfaki$$,
  $$Humanitarian Food Security & M&E Officer | Sudan Crisis Response$$,
  $$Port Sudan, Sudan$$,
  $$mid_career$$,
  NULL,
  $$Sudanese citizen; contracts as an individual. Can work remotely from Cairo or Nairobi if needed.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '8 days',
  $$https://i.pravatar.cc/150?u=demo-hiba-osman-elfaki$$,
  $$https://picsum.photos/seed/demo-hiba-osman-elfaki/800/200$$,
  $$Hiba Osman Elfaki has worked on humanitarian aid and food security in Sudan for nine years, and since 2023 on the response to the war and mass displacement. She designs monitoring and evaluation systems for food assistance and cash programmes, runs post-distribution monitoring surveys and remote monitoring through phone networks, and supports refugee and returnee assessments along the borders with Chad and South Sudan. She is skilled in managing local enumerator teams in insecure areas and in presenting data quickly to decision-makers. Hiba previously worked with a Sudanese NGO on drought response in Darfur.$$,
  $$[{"name":"Humanitarian Aid","tier":"primary","level":"item"},{"name":"Food Security","tier":"primary","level":"item"},{"name":"Refugee Support","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Monitoring & Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$]::text[],
  $$[{"organization":"International NGO (Sudan)","role":"MEAL Manager","start_year":2021,"end_year":null,"logo_url":null,"description":"M&E for food security and cash programmes."},{"organization":"Sudanese NGO (Darfur)","role":"Monitoring Officer","start_year":2016,"end_year":2021,"logo_url":null,"description":"Monitoring of drought response."}]$$::jsonb,
  $$[{"institution":"University of Khartoum","degree_or_course":"BSc Statistics","start_year":2010,"end_year":2015,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Karim Fathy Soliman (demo-karim-fathy-soliman)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '733b270c-913f-54b6-8b2c-6f4935db4528',
  NULL,
  $$Individual$$,
  $$demo-karim-fathy-soliman$$,
  $$Karim Fathy Soliman$$,
  $$Irrigation & Water Resources Engineer | Nile Delta Modernization, GIS | Egypt & MENA$$,
  $$Cairo, Egypt$$,
  $$senior$$,
  NULL,
  $$Egyptian citizen; contracts as an individual or through his engineering consultancy.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 90)::text, 'until', NULL),
  now() - interval '110 days',
  $$https://i.pravatar.cc/150?u=demo-karim-fathy-soliman$$,
  $$https://picsum.photos/seed/demo-karim-fathy-soliman/800/200$$,
  $$Karim Fathy Soliman is an irrigation and water resources engineer with twenty-four years of experience in Egypt, Sudan, Jordan and Morocco. He has led the design of irrigation modernization in the Nile Delta, including canal lining, pressurized systems and water user association development, and managed large projects for the Ministry of Water Resources and development banks. He uses GIS and remote sensing to map water use and salinity, and has prepared financial models for solar-powered irrigation pumping. Karim has worked with the World Bank, IFAD and the African Development Bank.$$,
  $$[{"name":"Irrigation Systems","tier":"primary","level":"item"},{"name":"Water Management","tier":"primary","level":"item"},{"name":"Renewable Energy","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"GIS Mapping","tier":"primary","level":"item"},{"name":"Financial Modeling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Consulting Engineer (Irrigation)","issuing_organization":"Egyptian Engineers Syndicate","year":2008,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Arabic$$, $$English$$, $$French$$]::text[],
  $$[{"organization":"Independent consultant","role":"Irrigation Engineer","start_year":2015,"end_year":null,"logo_url":null,"description":"Irrigation design and project management in MENA."},{"organization":"Ministry of Water Resources and Irrigation, Egypt","role":"Senior Engineer, Irrigation Improvement","start_year":2001,"end_year":2015,"logo_url":null,"description":"Led irrigation modernization projects in the Delta."}]$$::jsonb,
  $$[{"institution":"Cairo University","degree_or_course":"MSc Irrigation Engineering","start_year":1998,"end_year":2001,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Shilan Kareem Mahmoud (demo-shilan-kareem-mahmoud)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '329cd0eb-e66e-5856-8fa1-5fdb36e20f38',
  NULL,
  $$Individual$$,
  $$demo-shilan-kareem-mahmoud$$,
  $$Shilan Kareem Mahmoud$$,
  $$Post-Conflict Recovery Programme Manager | IDP Returns & Reconstruction | Iraq & Kurdistan Region$$,
  $$Erbil, Iraq$$,
  $$mid_career$$,
  NULL,
  $$Iraqi citizen; contracts as an individual consultant.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '15 days',
  $$https://i.pravatar.cc/150?u=demo-shilan-kareem-mahmoud$$,
  $$https://picsum.photos/seed/demo-shilan-kareem-mahmoud/800/200$$,
  $$Shilan Kareem Mahmoud has managed post-conflict reconstruction and humanitarian programmes in Iraq for twelve years. She led housing and infrastructure rehabilitation for returning internally displaced families in Sinjar and Nineveh, coordinated with local authorities and community leaders on returns, and managed refugee support programmes for Syrian Kurds in camps in the Kurdistan Region. She is an experienced project manager of multi-donor budgets, and interprets between Kurdish, Arabic and English during community meetings. Shilan is trained as a civil engineer, which helps her manage contractors and verify construction quality on site, and she is experienced in negotiating with local authorities over property and housing claims.$$,
  $$[{"name":"Post-Conflict Reconstruction","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"secondary","level":"item"},{"name":"Refugee Support","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"Interpretation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Kurdish$$, $$Arabic$$, $$English$$]::text[],
  $$[{"organization":"UNDP Iraq","role":"Programme Manager, Stabilization","start_year":2019,"end_year":2024,"logo_url":"https://cdn.brandfetch.io/undp.org","description":"Managed rehabilitation in areas of return."},{"organization":"International NGO (Erbil)","role":"Project Manager","start_year":2013,"end_year":2019,"logo_url":null,"description":"Camp services and refugee programmes."}]$$::jsonb,
  $$[{"institution":"Salahaddin University-Erbil","degree_or_course":"BSc Civil Engineering","start_year":2008,"end_year":2012,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Elif Kaya Demir (demo-elif-kaya-demir)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'bd5ed935-89fd-5a53-b3b6-7cab3dd2df08',
  NULL,
  $$Individual$$,
  $$demo-elif-kaya-demir$$,
  $$Elif Kaya Demir$$,
  $$Humanitarian Logistics & Data Officer | Supply Chain Databases | Türkiye–Syria Cross-Border$$,
  $$Gaziantep, Türkiye$$,
  $$early_career$$,
  NULL,
  $$Turkish citizen; contracts as an individual.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 90)::text),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 90)::text),
  now() - interval '225 days',
  $$https://i.pravatar.cc/150?u=demo-elif-kaya-demir$$,
  $$https://picsum.photos/seed/demo-elif-kaya-demir/800/200$$,
  $$Elif Kaya Demir is a humanitarian logistics officer with four years of experience in the Türkiye–Syria cross-border response. She manages supply chain and warehouse databases, tracks cross-border shipments of relief items, and builds reports for logistics clusters. After the 2023 earthquakes she helped coordinate warehouse operations in Gaziantep and Hatay. Elif is comfortable with database management and data cleaning and is looking to develop into a supply chain data analyst for humanitarian organizations. She works in Turkish, Arabic and English and is used to coordinating with partners on both sides of the border, often under tight deadlines and changing access conditions.$$,
  $$[{"name":"Logistics & Supply Chain","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Database Management","tier":"primary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Turkish$$, $$Arabic$$, $$English$$]::text[],
  $$[{"organization":"International NGO (Gaziantep)","role":"Logistics Officer","start_year":2021,"end_year":2025,"logo_url":null,"description":"Cross-border shipment tracking and warehouse data."},{"organization":"Turkish Red Crescent","role":"Logistics Volunteer","start_year":2020,"end_year":2021,"logo_url":null,"description":"Warehouse support."}]$$::jsonb,
  $$[{"institution":"Gaziantep University","degree_or_course":"BSc Industrial Engineering","start_year":2016,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Hartwell & Crane Consulting (demo-hartwell-crane-consulting)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '6baf13da-992b-57dd-bf73-5765cda49e7c',
  NULL,
  $$Large Firm$$,
  $$demo-hartwell-crane-consulting$$,
  $$Hartwell & Crane Consulting$$,
  $$Global Development Consultancy | Health, Social Protection & Evaluation | Africa, Asia & MENA$$,
  $$London, United Kingdom$$,
  NULL,
  1979,
  $$UK private limited company with regional offices in Nairobi, Dakar and Amman. Holds FCDO, EU and UN framework agreements.$$,
  ARRAY[$$On-site$$, $$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '6 days',
  $$https://i.pravatar.cc/150?u=demo-hartwell-crane-consulting$$,
  $$https://picsum.photos/seed/demo-hartwell-crane-consulting/800/200$$,
  $$Hartwell & Crane Consulting is a London-headquartered development consultancy of 450 staff founded in 1979, with regional offices in Nairobi, Dakar and Amman. It designs and evaluates programmes in health systems, social protection, nutrition and primary education for governments, FCDO, the EU and UN agencies. Its evaluation practice runs impact evaluations, large-scale monitoring and evaluation contracts and policy analysis, supported by in-house statisticians and survey specialists. The firm has managed more than 1,000 assignments in over 90 countries and offers project management for multi-country technical assistance.$$,
  $$[{"name":"Health Systems","tier":"primary","level":"item"},{"name":"Social Protection","tier":"primary","level":"item"},{"name":"Nutrition","tier":"secondary","level":"item"},{"name":"Primary Education","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Monitoring & Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"},{"name":"Policy Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"BSI","year":2010,"credential_id_or_url":null},{"name":"Cyber Essentials Plus","issuing_organization":"IASME","year":2022,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$French$$, $$Spanish$$, $$Portuguese$$, $$Arabic$$]::text[],
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

-- Groupe Sillon Conseil (demo-groupe-sillon-conseil)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '3185c40a-d62f-58c1-b762-31ec64869cc0',
  NULL,
  $$Large Firm$$,
  $$demo-groupe-sillon-conseil$$,
  $$Groupe Sillon Conseil$$,
  $$Agriculture & Food Systems Consultancy | M&E, Evaluation & Training | Francophone Africa$$,
  $$Paris, France$$,
  NULL,
  1992,
  $$French SAS with subsidiaries in Dakar and Ouagadougou; contracts as a firm under EU, AFD and World Bank rules.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '45 days',
  $$https://i.pravatar.cc/150?u=demo-groupe-sillon-conseil$$,
  $$https://picsum.photos/seed/demo-groupe-sillon-conseil/800/200$$,
  $$Groupe Sillon Conseil is a Paris-based consultancy of 120 staff founded in 1992 that works on agriculture and food systems in Francophone Africa, the Maghreb and Lusophone countries. It designs and evaluates programmes on farmer organizations, value chains, climate adaptation in agriculture and food security policy. The firm's monitoring and evaluation practice runs baseline surveys, mid-term and final evaluations and impact evaluations, and its training unit delivers training of trainers for extension services. Clients include AFD, the EU, IFAD and national ministries of agriculture.$$,
  $$[{"name":"Agriculture & Food","tier":"primary","level":"category"},{"name":"Climate Adaptation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Monitoring & Evaluation","tier":"primary","level":"item"},{"name":"Impact Evaluation","tier":"secondary","level":"item"},{"name":"Training of Trainers","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$English$$, $$Arabic$$, $$Portuguese$$]::text[],
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

-- Polder Water & Climate Partners (demo-polder-water-climate-partners)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '63c241bc-99cc-5493-9963-95c2297eb24a',
  NULL,
  $$Large Firm$$,
  $$demo-polder-water-climate-partners$$,
  $$Polder Water & Climate Partners$$,
  $$Water & Climate Adaptation Engineering Firm | Delta Planning, WASH, PPPs | Global$$,
  $$Rotterdam, Netherlands$$,
  NULL,
  1996,
  $$Dutch B.V. with project offices in Dhaka, Jakarta and Maputo; contracts as a firm under Dutch, EU and development bank rules.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '20 days',
  $$https://i.pravatar.cc/150?u=demo-polder-water-climate-partners$$,
  $$https://picsum.photos/seed/demo-polder-water-climate-partners/800/200$$,
  $$Polder Water & Climate Partners is a Rotterdam engineering and advisory firm of 300 staff founded in 1996. It works on water management and climate adaptation in deltas and coastal cities, including flood risk planning, urban drainage, irrigation and WASH infrastructure. The firm prepares feasibility studies and public-private partnership structures for water utilities, uses GIS and hydraulic modelling for planning, and provides project management for large adaptation programmes. It has worked in Bangladesh, Vietnam, Indonesia, Mozambique and Colombia for governments and development banks.$$,
  $$[{"name":"Water Management","tier":"primary","level":"item"},{"name":"Climate Adaptation","tier":"primary","level":"item"},{"name":"WASH","tier":"secondary","level":"item"},{"name":"Irrigation Systems","tier":"secondary","level":"item"},{"name":"Public-Private Partnerships","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"GIS Mapping","tier":"primary","level":"item"},{"name":"Financial Modeling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"DNV","year":2008,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Dutch$$, $$French$$, $$Spanish$$]::text[],
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

-- Leïla Benali Rossi (demo-leila-benali-rossi)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '18d2862d-f78f-5b2c-a14f-c02199ffc530',
  NULL,
  $$Individual$$,
  $$demo-leila-benali-rossi$$,
  $$Leïla Benali Rossi$$,
  $$Conference Interpreter Arabic–French–English | Humanitarian Diplomacy & Negotiations | Geneva$$,
  $$Geneva, Switzerland$$,
  $$senior$$,
  NULL,
  $$Swiss and Italian citizen; contracts as an individual (self-employed, AVS registered).$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '7 days',
  $$https://i.pravatar.cc/150?u=demo-leila-benali-rossi$$,
  $$https://picsum.photos/seed/demo-leila-benali-rossi/800/200$$,
  $$Leïla Benali Rossi is a conference interpreter and translator with twenty years of experience in humanitarian diplomacy. Based in Geneva, she interprets between Arabic, French and English for UN humanitarian meetings, donor conferences and confidential negotiations on access and protection, and translates sensitive reports and agreements. She has worked in the field in Libya, Syria, Yemen and the Sahel, and provides subtitling for humanitarian documentaries. Leïla is accredited with several UN agencies and is known for accuracy under pressure and discretion.$$,
  $$[{"name":"Humanitarian Aid","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Interpretation","tier":"primary","level":"item"},{"name":"Translation","tier":"primary","level":"item"},{"name":"Subtitling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Member","issuing_organization":"International Association of Conference Interpreters (AIIC)","year":2009,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Arabic$$, $$French$$, $$English$$, $$Italian$$]::text[],
  $$[{"organization":"Freelance","role":"Conference Interpreter","start_year":2008,"end_year":null,"logo_url":null,"description":"Interpreting for UN agencies, NGOs and governments."},{"organization":"International humanitarian organization (Geneva)","role":"Staff Interpreter","start_year":2004,"end_year":2008,"logo_url":null,"description":"Field and headquarters interpreting."}]$$::jsonb,
  $$[{"institution":"University of Geneva, Faculty of Translation and Interpreting","degree_or_course":"MA Conference Interpreting","start_year":2002,"end_year":2004,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Thomas Ashworth (demo-thomas-ashworth)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '9bb27515-fdd2-50f6-a57c-d4318d104275',
  NULL,
  $$Individual$$,
  $$demo-thomas-ashworth$$,
  $$Thomas Ashworth$$,
  $$Academic Editor & Writer | Research Reports, Book Manuscripts | Oxford$$,
  $$Oxford, United Kingdom$$,
  $$senior$$,
  NULL,
  $$UK citizen; invoices as a sole trader.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '90 days',
  $$https://i.pravatar.cc/150?u=demo-thomas-ashworth$$,
  $$https://picsum.photos/seed/demo-thomas-ashworth/800/200$$,
  $$Thomas Ashworth is an academic editor and writer with twenty-five years of experience in higher education and development research publishing. He was managing editor of a development studies journal and editorial director at a university press, and now edits book manuscripts, research reports and journal articles for universities, think tanks and international organizations. He also ghostwrites and restructures long reports into readable publications and advises on publication layout. Thomas has a particular interest in helping authors writing in English as a second language publish their research.$$,
  $$[{"name":"Tertiary Education","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Academic Editing","tier":"primary","level":"item"},{"name":"Technical Writing","tier":"primary","level":"item"},{"name":"Ghostwriting","tier":"secondary","level":"item"},{"name":"Publication Layout","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$German$$]::text[],
  $$[{"organization":"Freelance","role":"Academic Editor","start_year":2014,"end_year":null,"logo_url":null,"description":"Editing for universities, think tanks and international organizations."},{"organization":"University press (Oxford)","role":"Editorial Director, Development Studies","start_year":2004,"end_year":2014,"logo_url":null,"description":"Commissioned and edited books."}]$$::jsonb,
  $$[{"institution":"University of Oxford","degree_or_course":"DPhil History","start_year":1994,"end_year":1998,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Mar Aberto Language Services (demo-mar-aberto-language-services)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '5cf7c449-ab56-5ea7-b5b3-75178660ad3f',
  NULL,
  $$Small Firm$$,
  $$demo-mar-aberto-language-services$$,
  $$Mar Aberto Language Services$$,
  $$Language Services for Development | Localization, Subtitling & E-Learning | Lusophone & Global$$,
  $$Lisbon, Portugal$$,
  NULL,
  2009,
  $$Portuguese company (Lda.); contracts as a firm and invoices EU and international clients.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '11 days',
  $$https://i.pravatar.cc/150?u=demo-mar-aberto-language-services$$,
  $$https://picsum.photos/seed/demo-mar-aberto-language-services/800/200$$,
  $$Mar Aberto Language Services is a Lisbon firm of nine linguists and project managers founded in 2009. It provides localization, translation, transcreation and subtitling for development and humanitarian organizations, with a focus on Portuguese-speaking countries in Africa and Brazil. The firm localizes e-learning courses and learning platforms, subtitles training videos and documentaries, and manages terminology for health, education and social protection programmes. It works with a network of native-speaker translators in Mozambique, Angola, Guinea-Bissau and Cabo Verde. Every project goes through a two-step review by a second linguist before delivery.$$,
  $$[{"name":"Human Development","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Localization","tier":"primary","level":"item"},{"name":"Subtitling","tier":"primary","level":"item"},{"name":"Translation","tier":"secondary","level":"item"},{"name":"Transcreation","tier":"secondary","level":"item"},{"name":"E-Learning Development","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Portuguese$$, $$English$$, $$Spanish$$, $$French$$]::text[],
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

-- Giulia Ferraro Benedetti (demo-giulia-ferraro-benedetti)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'b508465a-b1b3-586d-b5b2-b2a3302df9ea',
  NULL,
  $$Individual$$,
  $$demo-giulia-ferraro-benedetti$$,
  $$Giulia Ferraro Benedetti$$,
  $$Food Security & Nutrition Data Scientist | Statistical Analysis, R & Python | Rome$$,
  $$Rome, Italy$$,
  $$mid_career$$,
  NULL,
  $$Italian citizen; contracts as an individual (partita IVA).$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  now() - interval '14 days',
  $$https://i.pravatar.cc/150?u=demo-giulia-ferraro-benedetti$$,
  $$https://picsum.photos/seed/demo-giulia-ferraro-benedetti/800/200$$,
  $$Giulia Ferraro Benedetti is a data scientist specializing in food security and nutrition statistics. Over ten years at Rome-based UN agencies and as a consultant, she has analysed household surveys and food consumption data, built models of the prevalence of undernourishment, and developed R and Python tools for nutrition surveillance. She advises national statistics offices on survey methods and has contributed to global food security reports. Giulia is also interested in sustainable farming practices and their links to diet quality.$$,
  $$[{"name":"Food Security","tier":"primary","level":"item"},{"name":"Nutrition","tier":"primary","level":"item"},{"name":"Sustainable Farming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Data Science","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"primary","level":"item"},{"name":"Python/R","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Italian$$, $$English$$, $$French$$, $$Spanish$$]::text[],
  $$[{"organization":"Independent consultant","role":"Food Security Data Scientist","start_year":2021,"end_year":null,"logo_url":null,"description":"Statistical analysis for UN agencies and statistics offices."},{"organization":"FAO Statistics Division","role":"Statistician","start_year":2015,"end_year":2021,"logo_url":null,"description":"Food security indicator estimation."}]$$::jsonb,
  $$[{"institution":"Sapienza University of Rome","degree_or_course":"PhD Statistics","start_year":2011,"end_year":2015,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Jonas Weber-Lindqvist (demo-jonas-weber-lindqvist)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '19e6abe5-7d45-5fc7-bf74-b6c9b5d77180',
  NULL,
  $$Individual$$,
  $$demo-jonas-weber-lindqvist$$,
  $$Jonas Weber-Lindqvist$$,
  $$Climate Policy & Advocacy Advisor | Mitigation, Nature & Circular Economy | Bonn$$,
  $$Bonn, Germany$$,
  $$mid_career$$,
  NULL,
  $$German citizen; contracts as a freelancer (Freiberufler).$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 120)::text, 'until', NULL),
  now() - interval '120 days',
  $$https://i.pravatar.cc/150?u=demo-jonas-weber-lindqvist$$,
  $$https://picsum.photos/seed/demo-jonas-weber-lindqvist/800/200$$,
  $$Jonas Weber-Lindqvist advises NGOs and foundations on climate policy and advocacy. Over eleven years he has followed UN climate negotiations, written policy briefs on climate mitigation targets, biodiversity finance and circular economy policy, and run advocacy campaigns and media relations around climate summits. He previously worked for a German environmental NGO and a climate think tank in Bonn. Jonas helps organizations turn technical positions into campaigns that ministers and journalists pay attention to. He works in German, English and Spanish and has trained Latin American partners on climate negotiation tactics and messaging.$$,
  $$[{"name":"Climate Mitigation","tier":"primary","level":"item"},{"name":"Biodiversity","tier":"secondary","level":"item"},{"name":"Circular Economy","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Briefs","tier":"primary","level":"item"},{"name":"Advocacy Campaigns","tier":"secondary","level":"item"},{"name":"Media Relations","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$German$$, $$English$$, $$Spanish$$]::text[],
  $$[{"organization":"Freelance","role":"Climate Policy and Advocacy Advisor","start_year":2020,"end_year":null,"logo_url":null,"description":"Advisory for NGOs and foundations."},{"organization":"German environmental NGO","role":"Climate Policy Officer","start_year":2014,"end_year":2020,"logo_url":null,"description":"Policy and advocacy on climate negotiations."}]$$::jsonb,
  $$[{"institution":"University of Bonn","degree_or_course":"MSc Geography","start_year":2011,"end_year":2013,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Oksana Melnyk-Hrytsenko (demo-oksana-melnyk-hrytsenko)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '59577cf7-481a-572b-9f52-81576e58150d',
  NULL,
  $$Individual$$,
  $$demo-oksana-melnyk-hrytsenko$$,
  $$Oksana Melnyk-Hrytsenko$$,
  $$Recovery & Digital Governance Specialist | Reconstruction Transparency | Ukraine$$,
  $$Kyiv, Ukraine$$,
  $$senior$$,
  NULL,
  $$Ukrainian citizen; contracts as an individual entrepreneur (FOP).$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '5 days',
  $$https://i.pravatar.cc/150?u=demo-oksana-melnyk-hrytsenko$$,
  $$https://picsum.photos/seed/demo-oksana-melnyk-hrytsenko/800/200$$,
  $$Oksana Melnyk-Hrytsenko works on post-conflict reconstruction and digital governance in Ukraine. Over fifteen years she has managed e-government projects with the national digital transformation agenda, and since 2022 has advised on digital systems for tracking reconstruction projects and damage claims to support transparency and anti-corruption. She leads change management with municipalities adopting new digital tools and oversees database management and integration with procurement systems. Oksana has worked with development partners, the national recovery agency and municipal governments. She works in Ukrainian, Russian and English and has trained hundreds of municipal staff.$$,
  $$[{"name":"Post-Conflict Reconstruction","tier":"primary","level":"item"},{"name":"Digital Governance","tier":"primary","level":"item"},{"name":"Anti-Corruption","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Change Management","tier":"primary","level":"item"},{"name":"Database Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Ukrainian$$, $$Russian$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Recovery and Digital Governance Specialist","start_year":2022,"end_year":null,"logo_url":null,"description":"Digital reconstruction tracking for development partners."},{"organization":"E-government programme (Kyiv)","role":"Project Manager","start_year":2011,"end_year":2022,"logo_url":null,"description":"Managed e-services and open data projects."}]$$::jsonb,
  $$[{"institution":"Taras Shevchenko National University of Kyiv","degree_or_course":"MA Public Administration","start_year":2007,"end_year":2009,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Losana Vakaloloma (demo-losana-vakaloloma)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '87adf5b5-656f-52d7-8ea7-184af2fbb754',
  NULL,
  $$Individual$$,
  $$demo-losana-vakaloloma$$,
  $$Losana Vakaloloma$$,
  $$Climate Adaptation & Disability Inclusion Facilitator | Community Resilience | Fiji & Pacific$$,
  $$Suva, Fiji$$,
  $$senior$$,
  NULL,
  $$Fijian citizen; contracts as an individual consultant.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '65 days',
  $$https://i.pravatar.cc/150?u=demo-losana-vakaloloma$$,
  $$https://picsum.photos/seed/demo-losana-vakaloloma/800/200$$,
  $$Losana Vakaloloma has worked on community climate adaptation and disability inclusion across the Pacific for eighteen years. She facilitates community adaptation planning in Fijian villages facing coastal erosion and relocation, ensures that persons with disabilities and women shape those plans, and mentors young Pacific facilitators. She has supported governments and regional organizations on inclusive disaster preparedness and public outreach campaigns. Losana is a respected facilitator of talanoa dialogue and works in English, Fijian and Hindi. She also advises regional organizations on making climate finance proposals inclusive of persons with disabilities.$$,
  $$[{"name":"Climate Adaptation","tier":"primary","level":"item"},{"name":"Disability Inclusion","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Workshop Facilitation","tier":"primary","level":"item"},{"name":"Mentoring","tier":"secondary","level":"item"},{"name":"Public Outreach","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Fijian$$, $$Hindi$$]::text[],
  $$[{"organization":"Independent consultant","role":"Community Resilience Facilitator","start_year":2015,"end_year":null,"logo_url":null,"description":"Adaptation planning and inclusion in Pacific communities."},{"organization":"Pacific disability forum","role":"Programme Coordinator","start_year":2008,"end_year":2015,"logo_url":null,"description":"Disability-inclusive development programmes."}]$$::jsonb,
  $$[{"institution":"University of the South Pacific","degree_or_course":"MA Development Studies","start_year":2005,"end_year":2007,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Kila Nangui (demo-kila-nangui)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'ec044c84-4d5d-5c10-b716-40bf0e0e04d2',
  NULL,
  $$Individual$$,
  $$demo-kila-nangui$$,
  $$Kila Nangui$$,
  $$Road Safety & Rural Roads Specialist | Project Management | Papua New Guinea$$,
  $$Port Moresby, Papua New Guinea$$,
  $$senior$$,
  NULL,
  $$Papua New Guinean citizen; contracts as an individual.$$,
  ARRAY[$$On-site$$]::text[],
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 45)::text),
  now() - interval '290 days',
  $$https://i.pravatar.cc/150?u=demo-kila-nangui$$,
  $$https://picsum.photos/seed/demo-kila-nangui/800/200$$,
  $$Kila Nangui is a transport specialist with sixteen years of experience on rural roads and road safety in Papua New Guinea. He has managed road maintenance and rehabilitation projects in the Highlands, supervised contractors and community maintenance groups, and led road safety surveys and awareness programmes along major highways. His work also covers logistics for agricultural produce moving from the Highlands to coastal markets. Kila has worked with the Department of Works, the Asian Development Bank and the Australian aid programme.$$,
  $$[{"name":"Road Safety","tier":"primary","level":"item"},{"name":"Logistics & Supply Chain","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Tok Pisin$$]::text[],
  $$[{"organization":"Department of Works and Highways, PNG","role":"Senior Project Engineer","start_year":2012,"end_year":2024,"logo_url":null,"description":"Road rehabilitation and maintenance in the Highlands."},{"organization":"Road contractor (Lae)","role":"Site Engineer","start_year":2008,"end_year":2012,"logo_url":null,"description":"Road construction supervision."}]$$::jsonb,
  $$[{"institution":"Papua New Guinea University of Technology","degree_or_course":"BEng Civil Engineering","start_year":2003,"end_year":2007,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Hanna Tesfaye (demo-hanna-tesfaye)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'c213a538-7504-5b5e-8a7f-da2b43d3eae7',
  NULL,
  $$Individual$$,
  $$demo-hanna-tesfaye$$,
  $$Hanna Tesfaye$$,
  $$Nutrition Evaluation Lead | Impact Evaluation & Anthropometric Surveys | Ethiopia & Horn of Africa$$,
  $$Addis Ababa, Ethiopia$$,
  $$senior$$,
  NULL,
  $$Ethiopian citizen; contracts as an individual consultant or through her registered sole proprietorship in Addis Ababa. No work permit needed in Ethiopia; travels on an Ethiopian passport (visas required for most of Europe).$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  now() - interval '6 days',
  $$https://i.pravatar.cc/150?u=demo-hanna-tesfaye$$,
  $$https://picsum.photos/seed/demo-hanna-tesfaye/800/200$$,
  $$Hanna Tesfaye has spent sixteen years evaluating nutrition and health programmes in Ethiopia and the wider Horn of Africa. She has led four impact evaluations with anthropometric outcomes — stunting, wasting and minimum acceptable diet — using difference-in-differences and matching designs built on programme baselines. She designs household surveys end to end, from sampling and SMART-compatible measurement protocols to enumerator training and data quality checks, and runs the statistical analysis herself in Stata and R. Before consulting she managed the nutrition research portfolio at a national public health institute, which gave her a working knowledge of the health management information system and of how regional health bureaus actually use evidence. She is known for validation workshops that leave ministry counterparts owning the recommendations, and for evaluation reports that put women's decision-making over food and cash at the centre of the analysis.$$,
  $$[{"name":"Nutrition","tier":"primary","level":"item"},{"name":"Health Systems","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"secondary","level":"item"},{"name":"Social Protection","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"},{"name":"Monitoring & Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Certificate in Advanced Impact Evaluation","issuing_organization":"International Initiative for Impact Evaluation (3ie)","year":2017,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Amharic$$, $$English$$, $$Tigrinya$$]::text[],
  $$[{"organization":"Independent consultant","role":"Nutrition Evaluation Lead","start_year":2018,"end_year":null,"logo_url":null,"description":"Endline and mid-term evaluations of nutrition and safety-net programmes for UN agencies, NGOs and bilateral donors."},{"organization":"Ethiopian Public Health Institute","role":"Senior Researcher, Food Science and Nutrition","start_year":2012,"end_year":2018,"logo_url":null,"description":"Managed national nutrition surveys and operational research on community management of acute malnutrition."},{"organization":"UNICEF Ethiopia","role":"Nutrition Officer","start_year":2009,"end_year":2012,"logo_url":"https://cdn.brandfetch.io/unicef.org","description":"Supported the scale-up of community-based management of acute malnutrition in Amhara and Tigray."}]$$::jsonb,
  $$[{"institution":"London School of Hygiene & Tropical Medicine","degree_or_course":"MSc Nutrition for Global Health","start_year":2007,"end_year":2008,"logo_url":null},{"institution":"Addis Ababa University","degree_or_course":"BSc Public Health","start_year":2002,"end_year":2006,"logo_url":null}]$$::jsonb,
  $$[{"organization":"Ethiopian Evaluation Association","role":"Board member","start_year":2021,"end_year":null,"description":"Leads the association's working group on evaluation standards for the health sector."}]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Abdiwali Hersi Warsame (demo-abdiwali-hersi-warsame)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'a392f260-9f5b-5543-a18c-b20b0ba251f0',
  NULL,
  $$Individual$$,
  $$demo-abdiwali-hersi-warsame$$,
  $$Abdiwali Hersi Warsame$$,
  $$Nutrition Survey Specialist | SMART Surveys & Humanitarian Nutrition | Somali Region & Somalia$$,
  $$Hargeisa, Somalia$$,
  $$mid_career$$,
  NULL,
  $$Somali national with an Ethiopian residence permit for Jigjiga-based assignments. Contracts as an individual; can invoice through a registered consultancy in Hargeisa.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date + 90)::text),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '14 days',
  $$https://i.pravatar.cc/150?u=demo-abdiwali-hersi-warsame$$,
  $$https://picsum.photos/seed/demo-abdiwali-hersi-warsame/800/200$$,
  $$Abdiwali Hersi Warsame is a nutrition survey specialist who has worked across the Somali region of Ethiopia, Somaliland and south-central Somalia for nine years. He has designed and led more than twenty SMART and coverage surveys for humanitarian agencies, adapting sampling to pastoralist mobility and insecure areas and training enumerator teams in anthropometric measurement. His statistical analysis work covers wasting and stunting trends, mortality estimates and the links between drought, food security and malnutrition. He also supports nutrition programme monitoring, building dashboards that cluster coordinators and regional health bureaus use for targeting. Abdiwali works fluently in Somali, which lets him run focus groups with mothers and community health workers directly, and he is comfortable spending long periods in the field.$$,
  $$[{"name":"Nutrition","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"secondary","level":"item"},{"name":"Food Security","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"},{"name":"Monitoring & Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"SMART Methodology Survey Manager","issuing_organization":"Action Against Hunger Canada / SMART","year":2018,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Somali$$, $$English$$, $$Arabic$$]::text[],
  $$[{"organization":"Save the Children Somalia","role":"Nutrition Surveillance Coordinator","start_year":2020,"end_year":2025,"logo_url":null,"description":"Coordinated nutrition surveillance and SMART surveys across Somaliland and Puntland."},{"organization":"FAO Somalia (FSNAU)","role":"Nutrition Analyst","start_year":2017,"end_year":2020,"logo_url":null,"description":"Analysed seasonal nutrition assessments for the Food Security and Nutrition Analysis Unit."}]$$::jsonb,
  $$[{"institution":"University of Hargeisa","degree_or_course":"BSc Public Health","start_year":2011,"end_year":2015,"logo_url":null},{"institution":"Jigjiga University","degree_or_course":"MPH (Nutrition)","start_year":2018,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'pending',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Meridian Health Analytics (demo-meridian-health-analytics)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'd225e46e-a8df-555f-8a6b-5a9acb824a4a',
  NULL,
  $$Small Firm$$,
  $$demo-meridian-health-analytics$$,
  $$Meridian Health Analytics$$,
  $$Health & Nutrition Evaluation Firm | Impact Evaluation, Surveys & Health Systems Analytics | East Africa$$,
  $$Nairobi, Kenya$$,
  NULL,
  2012,
  $$Registered in Kenya as Meridian Health Analytics Ltd, with a branch office in Addis Ababa. Contracts as a firm; holds national research permits in Kenya and Ethiopia.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '9 days',
  $$https://i.pravatar.cc/150?u=demo-meridian-health-analytics$$,
  $$https://picsum.photos/seed/demo-meridian-health-analytics/800/200$$,
  $$Meridian Health Analytics is a Nairobi-based evaluation firm of fourteen staff specializing in health and nutrition. Since 2012 the team has delivered more than forty evaluations and surveys for UN agencies, foundations and ministries of health in Kenya, Ethiopia, Somalia, Uganda and South Sudan. Its core strengths are quasi-experimental impact evaluation, large household surveys with anthropometry, and health systems analytics using HMIS and facility data. The firm runs its own trained enumerator network in Ethiopia and Kenya, with Amharic- and Somali-speaking field supervisors, and uses Python and R pipelines for data cleaning and statistical analysis. Recent work includes endline evaluations of maternal and child nutrition programmes, cost-effectiveness studies of community health workers, and data-quality audits of nutrition reporting systems.$$,
  $$[{"name":"Health Systems","tier":"primary","level":"item"},{"name":"Nutrition","tier":"primary","level":"item"},{"name":"Social Protection","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"primary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"},{"name":"Python/R","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 20252 Market, opinion and social research","issuing_organization":"Kenya Bureau of Standards","year":2021,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Swahili$$, $$Amharic$$, $$Somali$$]::text[],
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

-- Selamawit Girma (demo-selamawit-girma)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '626f112f-2798-5e84-b6ce-469efa5c7850',
  NULL,
  $$Individual$$,
  $$demo-selamawit-girma$$,
  $$Selamawit Girma$$,
  $$Programme Evaluator | Maternal & Child Nutrition Surveys and Impact Evaluation | Ethiopia$$,
  $$Addis Ababa, Ethiopia$$,
  $$mid_career$$,
  NULL,
  $$Ethiopian citizen; contracts as an individual consultant. Available for field travel across Ethiopia.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '20 days',
  $$https://i.pravatar.cc/150?u=demo-selamawit-girma$$,
  $$https://picsum.photos/seed/demo-selamawit-girma/800/200$$,
  $$Selamawit Girma is an Ethiopian programme evaluator with eight years of experience in maternal and child nutrition. She has designed household surveys with anthropometric measurement, trained enumerators, and contributed to quasi-experimental impact evaluations of nutrition-sensitive social protection programmes in Amhara, Oromia and the Somali region. Her statistical analysis work in Stata covers stunting, wasting and infant and young child feeding indicators, disaggregated by sex and livelihood zone. She has also assessed how health extension workers deliver growth monitoring and counselling through primary health care, and how women's control over cash transfers affects household diets. Selamawit writes clear evaluation reports in English and Amharic and has facilitated validation workshops with regional health bureaus.$$,
  $$[{"name":"Human Development","tier":"primary","level":"category"},{"name":"Gender & Social Inclusion","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Research & Analysis","tier":"primary","level":"category"},{"name":"Strategic & Operations","tier":"secondary","level":"category"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Amharic$$, $$English$$]::text[],
  $$[{"organization":"International Food Policy Research Institute (IFPRI) Ethiopia","role":"Research Officer","start_year":2019,"end_year":2024,"logo_url":null,"description":"Supported evaluations of nutrition-sensitive safety net programmes and household surveys."},{"organization":"Alive & Thrive Ethiopia","role":"Monitoring Officer","start_year":2016,"end_year":2019,"logo_url":null,"description":"Monitored infant and young child feeding counselling delivered by health extension workers."}]$$::jsonb,
  $$[{"institution":"Addis Ababa University","degree_or_course":"MSc Biostatistics","start_year":2014,"end_year":2016,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Yonas Alemu (demo-yonas-alemu)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '8da9a180-74d3-571e-a8a4-4904c9ffc7da',
  NULL,
  $$Individual$$,
  $$demo-yonas-alemu$$,
  $$Yonas Alemu$$,
  $$Nutrition Evaluator | Maternal & Child Nutrition Surveys and Impact Evaluation | Ethiopia$$,
  $$Addis Ababa, Ethiopia$$,
  $$mid_career$$,
  NULL,
  $$Ethiopian citizen; contracts as an individual consultant. Available for field travel across Ethiopia.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '20 days',
  $$https://i.pravatar.cc/150?u=demo-yonas-alemu$$,
  $$https://picsum.photos/seed/demo-yonas-alemu/800/200$$,
  $$Yonas Alemu is an Ethiopian nutrition evaluator with eight years of experience in maternal and child nutrition. He has designed household surveys with anthropometric measurement, trained enumerators, and contributed to quasi-experimental impact evaluations of nutrition-sensitive social protection programmes in Amhara, Oromia and the Somali region. His statistical analysis work in Stata covers stunting, wasting and infant and young child feeding indicators, disaggregated by sex and livelihood zone. He has also assessed how health extension workers deliver growth monitoring and counselling through primary health care, and how women's control over cash transfers affects household diets. Yonas writes clear evaluation reports in English and Amharic and has facilitated validation workshops with regional health bureaus.$$,
  $$[{"name":"Nutrition","tier":"primary","level":"item"},{"name":"Health Systems","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Amharic$$, $$English$$]::text[],
  $$[{"organization":"Concern Worldwide Ethiopia","role":"Nutrition Research Officer","start_year":2019,"end_year":2024,"logo_url":null,"description":"Supported evaluations of nutrition-sensitive safety net programmes and household surveys."},{"organization":"Ethiopian Public Health Institute","role":"Data Officer","start_year":2016,"end_year":2019,"logo_url":null,"description":"Managed data from national nutrition surveys."}]$$::jsonb,
  $$[{"institution":"Jimma University","degree_or_course":"MSc Human Nutrition","start_year":2014,"end_year":2016,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Dawit Kebede Abate (demo-dawit-kebede-abate)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '3e8dd2d0-9e2f-5843-bc4a-0cbfe901cec2',
  NULL,
  $$Individual$$,
  $$demo-dawit-kebede-abate$$,
  $$Dawit Kebede Abate$$,
  $$Urban Transport & Road Safety Specialist | BRT, PPP Structuring | Ethiopia & East Africa$$,
  $$Addis Ababa, Ethiopia$$,
  $$senior$$,
  NULL,
  $$Ethiopian citizen; contracts as an individual or through Abate Transport Engineering PLC.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 120)::text, 'until', (current_date + 480)::text),
  now() - interval '260 days',
  $$https://i.pravatar.cc/150?u=demo-dawit-kebede-abate$$,
  $$https://picsum.photos/seed/demo-dawit-kebede-abate/800/200$$,
  $$Dawit Kebede Abate is a transport engineer and planner with eighteen years of experience in urban mobility and road safety in Ethiopia, Kenya and Rwanda. He led the transport planning team for the first bus rapid transit corridor feasibility study in Addis Ababa, has prepared road safety action plans for three municipalities, and advises city administrations on public-private partnership structures for bus fleets and depots. His work combines traffic modelling, crash data analysis and stakeholder consultation with minibus operators and city agencies. Dawit has worked with the World Bank, the African Development Bank and the Addis Ababa City Roads Authority, and teaches a graduate course on transport planning at Addis Ababa Institute of Technology.$$,
  $$[{"name":"Urban Transport","tier":"primary","level":"item"},{"name":"Road Safety","tier":"primary","level":"item"},{"name":"Public-Private Partnerships","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"Financial Modeling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Professional Engineer (Civil)","issuing_organization":"Ethiopian Construction Authority","year":2012,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Amharic$$, $$English$$, $$Oromo$$]::text[],
  $$[{"organization":"World Bank Group","role":"Transport Consultant","start_year":2019,"end_year":2024,"logo_url":"https://cdn.brandfetch.io/worldbank.org","description":"Supported preparation of urban mobility and road safety operations in Ethiopia and Kenya."},{"organization":"Addis Ababa City Roads Authority","role":"Senior Transport Planner","start_year":2010,"end_year":2019,"logo_url":null,"description":"Led corridor planning and traffic safety programmes."}]$$::jsonb,
  $$[{"institution":"Addis Ababa Institute of Technology","degree_or_course":"MSc Road and Transport Engineering","start_year":2006,"end_year":2008,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Nusrat Jahan Chowdhury (demo-nusrat-jahan-chowdhury)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '7b955afd-03a8-54ca-b884-f580abebb5f1',
  NULL,
  $$Individual$$,
  $$demo-nusrat-jahan-chowdhury$$,
  $$Nusrat Jahan Chowdhury$$,
  $$Nutrition Impact Evaluation Specialist | Anthropometric Surveys & Health Systems | South Asia & East Africa$$,
  $$Dhaka, Bangladesh$$,
  $$senior$$,
  NULL,
  $$Bangladeshi citizen; contracts as an individual or through her registered consultancy in Dhaka. Available for international field missions of up to three months.$$,
  ARRAY[$$Remote$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date + 150)::text),
  now() - interval '4 days',
  $$https://i.pravatar.cc/150?u=demo-nusrat-jahan-chowdhury$$,
  $$https://picsum.photos/seed/demo-nusrat-jahan-chowdhury/800/200$$,
  $$Nusrat Jahan Chowdhury is a nutrition epidemiologist with seventeen years of experience designing and leading impact evaluations of maternal and child nutrition programmes. Based in Dhaka, she has led evaluations in Bangladesh, Nepal and Ethiopia, including a randomized evaluation of infant and young child feeding counselling and a difference-in-differences endline evaluation of nutrition-sensitive cash transfers. She is an expert in survey design for anthropometric outcomes, sample size calculation, and statistical analysis of stunting and wasting in Stata and R. Her health systems work covers community health worker programmes, supply chains for therapeutic food and the quality of growth monitoring data. Nusrat previously led nutrition research at icddr,b and has published widely on maternal nutrition.$$,
  $$[{"name":"Nutrition","tier":"primary","level":"item"},{"name":"Health Systems","tier":"primary","level":"item"},{"name":"Social Protection","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"},{"name":"Monitoring & Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Certificate in Advanced Impact Evaluation","issuing_organization":"International Initiative for Impact Evaluation (3ie)","year":2015,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Bengali$$, $$English$$, $$Hindi$$]::text[],
  $$[{"organization":"Independent consultant","role":"Nutrition Impact Evaluation Specialist","start_year":2020,"end_year":null,"logo_url":null,"description":"Leads nutrition evaluations for UN agencies and foundations in South Asia and East Africa."},{"organization":"icddr,b","role":"Scientist, Nutrition and Clinical Services Division","start_year":2011,"end_year":2020,"logo_url":null,"description":"Led nutrition trials and large-scale anthropometric surveys."},{"organization":"BRAC","role":"Research Fellow","start_year":2008,"end_year":2011,"logo_url":"https://cdn.brandfetch.io/brac.net","description":"Supported evaluations of community nutrition programmes."}]$$::jsonb,
  $$[{"institution":"Johns Hopkins Bloomberg School of Public Health","degree_or_course":"PhD International Health (Human Nutrition)","start_year":2005,"end_year":2010,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Lucía Barrios Cifuentes (demo-lucia-barrios-cifuentes)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '4ed07468-e1cb-539c-a0eb-e30541fc1379',
  NULL,
  $$Individual$$,
  $$demo-lucia-barrios-cifuentes$$,
  $$Lucía Barrios Cifuentes$$,
  $$Public Procurement & Anti-Corruption Expert | Open Contracting | Central America$$,
  $$Guatemala City, Guatemala$$,
  $$senior$$,
  NULL,
  $$Guatemalan citizen; contracts as an individual (registered with SAT as a professional service provider). Can travel freely within the CA-4 region.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 45)::text, 'until', NULL),
  now() - interval '11 days',
  $$https://i.pravatar.cc/150?u=demo-lucia-barrios-cifuentes$$,
  $$https://picsum.photos/seed/demo-lucia-barrios-cifuentes/800/200$$,
  $$Lucía Barrios Cifuentes has worked on public procurement reform and anti-corruption in Central America for nineteen years. She served as deputy director of Guatemala's procurement regulator, where she oversaw rules for the Guatecompras portal, and later advised procurement authorities in Honduras and El Salvador on adopting the Open Contracting Data Standard. As a consultant she has led integrity assessments of the procurement cycle, designed red-flag indicators for emergency procurement, and evaluated social audit programmes in which community committees monitor public works. She combines legal and institutional analysis with policy analysis that ministries can act on, and is an experienced facilitator of multi-stakeholder dialogue between government, auditors, bidders and civil-society organizations.$$,
  $$[{"name":"Anti-Corruption","tier":"primary","level":"item"},{"name":"Public Procurement","tier":"primary","level":"item"},{"name":"Citizen Engagement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Analysis","tier":"primary","level":"item"},{"name":"Stakeholder Facilitation","tier":"secondary","level":"item"},{"name":"Qualitative Research","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Certified Procurement Professional","issuing_organization":"Chartered Institute of Procurement & Supply (CIPS)","year":2014,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$, $$K'iche'$$]::text[],
  $$[{"organization":"Independent consultant","role":"Procurement Integrity Advisor","start_year":2018,"end_year":null,"logo_url":null,"description":"Assessments and reform advice for procurement authorities and development banks in Central America."},{"organization":"Dirección General de Adquisiciones del Estado, Guatemala","role":"Deputy Director","start_year":2012,"end_year":2018,"logo_url":null,"description":"Oversaw procurement regulations and the Guatecompras e-procurement portal."},{"organization":"Acción Ciudadana","role":"Program Coordinator","start_year":2007,"end_year":2012,"logo_url":null,"description":"Coordinated civil-society monitoring of public contracts."}]$$::jsonb,
  $$[{"institution":"Universidad Rafael Landívar","degree_or_course":"Licenciatura en Ciencias Jurídicas","start_year":2001,"end_year":2006,"logo_url":null},{"institution":"Universidad de Salamanca","degree_or_course":"Máster en Corrupción y Estado de Derecho","start_year":2010,"end_year":2011,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Andrés Castillo Zelaya (demo-andres-castillo-zelaya)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '4fab5dd8-5405-5186-9fee-858b5c0d927e',
  NULL,
  $$Individual$$,
  $$demo-andres-castillo-zelaya$$,
  $$Andrés Castillo Zelaya$$,
  $$Procurement Data Analyst | Red-Flag Indicators & Open Contracting | Honduras$$,
  $$Tegucigalpa, Honduras$$,
  $$mid_career$$,
  NULL,
  $$Honduran citizen; contracts as an individual consultant (RTN registered).$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '3 days',
  $$https://i.pravatar.cc/150?u=demo-andres-castillo-zelaya$$,
  $$https://picsum.photos/seed/demo-andres-castillo-zelaya/800/200$$,
  $$Andrés Castillo Zelaya is a data analyst specializing in public procurement and anti-corruption analytics. Over nine years he has built red-flag indicators, supplier concentration analyses and procurement dashboards from Central American e-procurement portals, first at the Honduran procurement regulator and then as a consultant for civil-society organizations and development banks. He is fluent in the Open Contracting Data Standard, cleans and links contract data with company registries, and presents results in policy briefs that journalists and auditors can use. His work has supported investigations into direct awards in the health sector and the design of digital governance tools that publish contract amendments automatically.$$,
  $$[{"name":"Public Procurement","tier":"primary","level":"item"},{"name":"Anti-Corruption","tier":"secondary","level":"item"},{"name":"Digital Governance","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Data Science","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Procurement Data Analyst","start_year":2021,"end_year":null,"logo_url":null,"description":"Procurement analytics for civil-society organizations and development banks."},{"organization":"Oficina Normativa de Contratación y Adquisiciones del Estado (ONCAE), Honduras","role":"Data Analyst","start_year":2016,"end_year":2021,"logo_url":null,"description":"Maintained HonduCompras data and produced procurement statistics."}]$$::jsonb,
  $$[{"institution":"Universidad Nacional Autónoma de Honduras","degree_or_course":"Licenciatura en Economía","start_year":2009,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Portfolio items for this part: replace wholesale.
DELETE FROM portfolio_items WHERE profile_id IN (SELECT id FROM profiles WHERE handle IN ($$demo-mai-abdel-aziz-fawzy$$, $$demo-hiba-osman-elfaki$$, $$demo-karim-fathy-soliman$$, $$demo-shilan-kareem-mahmoud$$, $$demo-elif-kaya-demir$$, $$demo-hartwell-crane-consulting$$, $$demo-groupe-sillon-conseil$$, $$demo-polder-water-climate-partners$$, $$demo-leila-benali-rossi$$, $$demo-thomas-ashworth$$, $$demo-mar-aberto-language-services$$, $$demo-giulia-ferraro-benedetti$$, $$demo-jonas-weber-lindqvist$$, $$demo-oksana-melnyk-hrytsenko$$, $$demo-losana-vakaloloma$$, $$demo-kila-nangui$$, $$demo-hanna-tesfaye$$, $$demo-abdiwali-hersi-warsame$$, $$demo-meridian-health-analytics$$, $$demo-selamawit-girma$$, $$demo-yonas-alemu$$, $$demo-dawit-kebede-abate$$, $$demo-nusrat-jahan-chowdhury$$, $$demo-lucia-barrios-cifuentes$$, $$demo-andres-castillo-zelaya$$));

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-mai-abdel-aziz-fawzy$$), $$Recycled Plastics Market Assessment, Greater Cairo$$, $$European Union$$, 2022, 2023, $$Market Research Lead$$, $$Assessed supply and demand for recycled plastics, with a survey of 400 informal collectors and 30 recyclers.$$, $$Findings shaped an EU-funded recycling SME grant window.$$, $$https://picsum.photos/seed/demo-mai-abdel-aziz-fawzy-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mai-abdel-aziz-fawzy-portfolio-1-img1/900/600","caption":"Sorting in Manshiyat Naser"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-mai-abdel-aziz-fawzy$$), $$Agricultural Residue Value Chains, Upper Egypt$$, $$UNIDO$$, 2019, 2020, $$Value Chain Analyst$$, $$Mapped supply chains for rice straw and sugarcane residues used in compost and boards.$$, $$Two pilot processing units established.$$, $$https://picsum.photos/seed/demo-mai-abdel-aziz-fawzy-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mai-abdel-aziz-fawzy-portfolio-2-img1/900/600","caption":"Rice straw collection"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-hiba-osman-elfaki$$), $$Remote Monitoring of Cash Assistance, Gezira and Khartoum$$, $$World Food Programme$$, 2023, 2024, $$MEAL Manager$$, $$Set up phone-based post-distribution monitoring of cash assistance for displaced households.$$, $$Monitoring covered 9,000 households and flagged access problems within days.$$, $$https://picsum.photos/seed/demo-hiba-osman-elfaki-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hiba-osman-elfaki-portfolio-1-img1/900/600","caption":"Remote monitoring call centre"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-hiba-osman-elfaki$$), $$Returnee and Refugee Assessment, White Nile$$, $$UNHCR Sudan$$, 2022, 2022, $$Survey Coordinator$$, $$Coordinated a household survey of South Sudanese refugees and Sudanese returnees on food security and services.$$, $$Assessment guided the joint response plan for the state.$$, $$https://picsum.photos/seed/demo-hiba-osman-elfaki-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hiba-osman-elfaki-portfolio-2-img1/900/600","caption":"Survey team in Kosti"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-karim-fathy-soliman$$), $$Irrigation Modernization, Kafr El Sheikh$$, $$World Bank$$, 2016, 2020, $$Project Manager$$, $$Managed modernization of 40,000 hectares of irrigation, including canal improvements and water user associations.$$, $$Water use efficiency improved and yields rose by 12%.$$, $$https://picsum.photos/seed/demo-karim-fathy-soliman-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-karim-fathy-soliman-portfolio-1-img1/900/600","caption":"Lined canal in the Delta"},{"url":"https://picsum.photos/seed/demo-karim-fathy-soliman-portfolio-1-img2/900/600","caption":"Water user association meeting"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-karim-fathy-soliman$$), $$Solar Irrigation Pumping Feasibility, Upper Egypt$$, $$IFAD$$, 2022, 2023, $$Lead Engineer$$, $$Assessed feasibility and prepared financial models for solar-powered pumping for smallholders.$$, $$Pilot financed for 300 farms.$$, $$https://picsum.photos/seed/demo-karim-fathy-soliman-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-karim-fathy-soliman-portfolio-2-img1/900/600","caption":"Solar pump installation"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-shilan-kareem-mahmoud$$), $$Housing Rehabilitation for Returnees, Sinjar$$, $$UNDP Iraq$$, 2020, 2023, $$Programme Manager$$, $$Managed rehabilitation of 2,300 houses and water networks for returning Yazidi families.$$, $$Return rates in target villages doubled over the programme.$$, $$https://picsum.photos/seed/demo-shilan-kareem-mahmoud-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-shilan-kareem-mahmoud-portfolio-1-img1/900/600","caption":"Rehabilitated houses in Sinjar"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-shilan-kareem-mahmoud$$), $$Camp Services for Syrian Refugees, Domiz$$, $$International NGO (Erbil)$$, 2014, 2018, $$Project Manager$$, $$Managed water, sanitation and community services in a refugee camp of 30,000 people.$$, $$Maintained services through two winter emergencies.$$, $$https://picsum.photos/seed/demo-shilan-kareem-mahmoud-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-shilan-kareem-mahmoud-portfolio-2-img1/900/600","caption":"Community centre in Domiz"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-elif-kaya-demir$$), $$Earthquake Response Warehouse Coordination$$, $$Logistics Cluster$$, 2023, 2023, $$Logistics Officer$$, $$Coordinated warehouse data and dispatches for relief items after the February 2023 earthquakes.$$, $$Dispatch tracking cut lost consignments in the first month.$$, $$https://picsum.photos/seed/demo-elif-kaya-demir-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-elif-kaya-demir-portfolio-1-img1/900/600","caption":"Warehouse in Gaziantep"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-elif-kaya-demir$$), $$Cross-Border Shipment Tracking Database$$, $$International NGO (Gaziantep)$$, 2021, 2022, $$Database Administrator$$, $$Built and maintained a database tracking cross-border shipments to north-west Syria.$$, $$Database adopted by three partner agencies.$$, $$https://picsum.photos/seed/demo-elif-kaya-demir-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-elif-kaya-demir-portfolio-2-img1/900/600","caption":"Shipment tracking report"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-hartwell-crane-consulting$$), $$Third-Party Monitoring and Evaluation of a Health Systems Programme, Nigeria$$, $$FCDO$$, 2018, 2023, $$Lead Firm$$, $$Ran monitoring and evaluation of a health systems strengthening programme in four states, including facility surveys and an impact evaluation of results-based financing.$$, $$Findings led FCDO to scale results-based financing to two more states.$$, $$https://picsum.photos/seed/demo-hartwell-crane-consulting-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hartwell-crane-consulting-portfolio-1-img1/900/600","caption":"Facility survey in Kaduna"},{"url":"https://picsum.photos/seed/demo-hartwell-crane-consulting-portfolio-1-img2/900/600","caption":"Evaluation findings workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-hartwell-crane-consulting$$), $$Social Protection Systems Review, Jordan$$, $$European Union$$, 2021, 2022, $$Lead Firm$$, $$Reviewed the national social protection strategy, targeting and payment systems with policy analysis of reform options.$$, $$Recommendations reflected in the updated national strategy.$$, $$https://picsum.photos/seed/demo-hartwell-crane-consulting-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hartwell-crane-consulting-portfolio-2-img1/900/600","caption":"Stakeholder workshop in Amman"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-groupe-sillon-conseil$$), $$Final Evaluation of a Farmer Organization Support Programme, Senegal and Mali$$, $$Agence Française de Développement$$, 2021, 2022, $$Lead Firm$$, $$Evaluated support to farmer organizations in rice and horticulture value chains, with a survey of 1,200 members.$$, $$Evaluation informed AFD's next programme in the Senegal River valley.$$, $$https://picsum.photos/seed/demo-groupe-sillon-conseil-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-groupe-sillon-conseil-portfolio-1-img1/900/600","caption":"Rice farmers in the Senegal River valley"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-groupe-sillon-conseil$$), $$Extension Service Training of Trainers, Morocco$$, $$IFAD$$, 2018, 2019, $$Training Provider$$, $$Designed and delivered a training of trainers programme on climate-smart practices for extension agents.$$, $$240 extension agents trained.$$, $$https://picsum.photos/seed/demo-groupe-sillon-conseil-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-groupe-sillon-conseil-portfolio-2-img1/900/600","caption":"Field training in the Middle Atlas"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-polder-water-climate-partners$$), $$Delta Plan Investment Programme Support, Bangladesh$$, $$Government of the Netherlands$$, 2018, 2022, $$Lead Firm$$, $$Supported preparation of investment projects under a national delta plan, including flood risk and water management modelling.$$, $$Eight projects prepared for development bank financing.$$, $$https://picsum.photos/seed/demo-polder-water-climate-partners-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-polder-water-climate-partners-portfolio-1-img1/900/600","caption":"Embankment in the coastal zone"},{"url":"https://picsum.photos/seed/demo-polder-water-climate-partners-portfolio-1-img2/900/600","caption":"Planning workshop in Dhaka"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-polder-water-climate-partners$$), $$Urban Drainage and Climate Adaptation Plan, Beira$$, $$World Bank$$, 2019, 2021, $$Engineering Firm$$, $$Designed drainage and coastal protection works after Cyclone Idai.$$, $$Works completed protecting 100,000 residents from flooding.$$, $$https://picsum.photos/seed/demo-polder-water-climate-partners-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-polder-water-climate-partners-portfolio-2-img1/900/600","caption":"Drainage channel construction in Beira"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-leila-benali-rossi$$), $$Humanitarian Pledging Conferences$$, $$UN OCHA$$, 2016, 2024, $$Interpreter$$, $$Interpreted Arabic, French and English at humanitarian pledging conferences and senior officials' meetings.$$, $$Interpreted at more than 30 high-level meetings.$$, $$https://picsum.photos/seed/demo-leila-benali-rossi-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-leila-benali-rossi-portfolio-1-img1/900/600","caption":"Interpreting booth at the Palais des Nations"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-leila-benali-rossi$$), $$Access Negotiations Support, Sahel$$, $$International humanitarian organization$$, 2020, 2021, $$Field Interpreter$$, $$Interpreted in confidential humanitarian access negotiations with local authorities and armed groups.$$, $$Supported agreements that reopened access to two districts.$$, $$https://picsum.photos/seed/demo-leila-benali-rossi-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-leila-benali-rossi-portfolio-2-img1/900/600","caption":"Field mission vehicle"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-thomas-ashworth$$), $$Edited Volume on African Universities$$, $$University research consortium$$, 2021, 2022, $$Editor$$, $$Edited a 20-chapter volume by African scholars on university governance and research.$$, $$Published open access and widely downloaded.$$, $$https://picsum.photos/seed/demo-thomas-ashworth-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-thomas-ashworth-portfolio-1-img1/900/600","caption":"Book cover"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-thomas-ashworth$$), $$Flagship Report Restructure$$, $$International organization$$, 2019, 2019, $$Editor and Writer$$, $$Restructured and edited a flagship report on education financing.$$, $$Report published on time with a shorter, clearer structure.$$, $$https://picsum.photos/seed/demo-thomas-ashworth-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-thomas-ashworth-portfolio-2-img1/900/600","caption":"Report spread"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-mar-aberto-language-services$$), $$Teacher Training E-Learning Localization, Mozambique and Angola$$, $$UNESCO$$, 2020, 2021, $$Localization Firm$$, $$Localized a teacher training e-learning platform into Mozambican and Angolan Portuguese.$$, $$Platform used by 12,000 teachers.$$, $$https://picsum.photos/seed/demo-mar-aberto-language-services-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mar-aberto-language-services-portfolio-1-img1/900/600","caption":"Localized platform screens"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-mar-aberto-language-services$$), $$Health Video Subtitling Series$$, $$Global health partnership$$, 2022, 2023, $$Subtitling Firm$$, $$Subtitled 80 training videos in Portuguese, Spanish and French.$$, $$Videos distributed to community health programmes in 20 countries.$$, $$https://picsum.photos/seed/demo-mar-aberto-language-services-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mar-aberto-language-services-portfolio-2-img1/900/600","caption":"Subtitling workstation"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-giulia-ferraro-benedetti$$), $$Undernourishment Estimates from Household Surveys$$, $$FAO$$, 2018, 2021, $$Statistician$$, $$Developed methods to estimate the prevalence of undernourishment from household consumption surveys.$$, $$Methods used for 40 countries in global food security reporting.$$, $$https://picsum.photos/seed/demo-giulia-ferraro-benedetti-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-giulia-ferraro-benedetti-portfolio-1-img1/900/600","caption":"Indicator methods workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-giulia-ferraro-benedetti$$), $$Nutrition Surveillance Toolkit in R$$, $$UNICEF$$, 2022, 2023, $$Data Scientist$$, $$Built an R toolkit for cleaning and analysing anthropometric survey data.$$, $$Toolkit used by nutrition clusters in six countries.$$, $$https://picsum.photos/seed/demo-giulia-ferraro-benedetti-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-giulia-ferraro-benedetti-portfolio-2-img1/900/600","caption":"Toolkit training session"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-jonas-weber-lindqvist$$), $$Climate Summit Advocacy Campaign$$, $$NGO coalition$$, 2021, 2021, $$Campaign Advisor$$, $$Advised an NGO coalition on advocacy and media relations around a climate summit.$$, $$Coalition messages featured in major European media.$$, $$https://picsum.photos/seed/demo-jonas-weber-lindqvist-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-jonas-weber-lindqvist-portfolio-1-img1/900/600","caption":"Press conference at the summit"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-jonas-weber-lindqvist$$), $$Circular Economy Policy Brief Series$$, $$Climate think tank$$, 2019, 2020, $$Author$$, $$Wrote policy briefs on circular economy measures in EU climate policy.$$, $$Briefs cited in parliamentary consultations.$$, $$https://picsum.photos/seed/demo-jonas-weber-lindqvist-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-jonas-weber-lindqvist-portfolio-2-img1/900/600","caption":"Policy brief cover"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-oksana-melnyk-hrytsenko$$), $$Reconstruction Project Tracking System$$, $$Development partner consortium$$, 2023, 2024, $$Digital Governance Advisor$$, $$Advised on a digital system tracking reconstruction projects from damage assessment to contract completion.$$, $$System covers thousands of reconstruction projects with public dashboards.$$, $$https://picsum.photos/seed/demo-oksana-melnyk-hrytsenko-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-oksana-melnyk-hrytsenko-portfolio-1-img1/900/600","caption":"Municipal training in Chernihiv"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-oksana-melnyk-hrytsenko$$), $$Municipal E-Services Roll-Out$$, $$E-government programme (Kyiv)$$, 2017, 2020, $$Project Manager$$, $$Managed roll-out of online administrative services in 60 municipalities with change management.$$, $$Online service uptake reached 45% of eligible transactions.$$, $$https://picsum.photos/seed/demo-oksana-melnyk-hrytsenko-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-oksana-melnyk-hrytsenko-portfolio-2-img1/900/600","caption":"Administrative service centre"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-losana-vakaloloma$$), $$Community Relocation Planning, Vanua Levu$$, $$Government of Fiji$$, 2019, 2021, $$Lead Facilitator$$, $$Facilitated planning with three coastal villages considering relocation, with inclusion of persons with disabilities.$$, $$Plans endorsed by village councils and the national relocation taskforce.$$, $$https://picsum.photos/seed/demo-losana-vakaloloma-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-losana-vakaloloma-portfolio-1-img1/900/600","caption":"Village talanoa session"},{"url":"https://picsum.photos/seed/demo-losana-vakaloloma-portfolio-1-img2/900/600","caption":"Coastal erosion site"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-losana-vakaloloma$$), $$Inclusive Disaster Preparedness Outreach$$, $$UNDP Pacific Office$$, 2016, 2017, $$Outreach Coordinator$$, $$Ran public outreach on accessible early warnings and evacuation for persons with disabilities.$$, $$Accessible warning messages adopted by the national disaster office.$$, $$https://picsum.photos/seed/demo-losana-vakaloloma-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-losana-vakaloloma-portfolio-2-img1/900/600","caption":"Outreach session in Labasa"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-kila-nangui$$), $$Highlands Highway Road Safety Programme$$, $$Asian Development Bank$$, 2018, 2021, $$Road Safety Coordinator$$, $$Led crash surveys and safety improvements along the Highlands Highway with community awareness.$$, $$Recorded crashes at treated black spots fell by 30%.$$, $$https://picsum.photos/seed/demo-kila-nangui-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kila-nangui-portfolio-1-img1/900/600","caption":"Black spot treatment on the highway"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-kila-nangui$$), $$Community Road Maintenance Groups$$, $$Australian Government (DFAT)$$, 2014, 2017, $$Project Manager$$, $$Managed community maintenance contracts for rural roads used to bring coffee and produce to markets.$$, $$450 km maintained by 60 community groups.$$, $$https://picsum.photos/seed/demo-kila-nangui-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kila-nangui-portfolio-2-img1/900/600","caption":"Community maintenance group"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-hanna-tesfaye$$), $$Endline Impact Evaluation of a Nutrition-Sensitive Safety Net Pilot, Amhara$$, $$UNICEF Ethiopia$$, 2023, 2024, $$Evaluation Team Leader$$, $$Led a difference-in-differences impact evaluation of nutrition-sensitive cash transfers layered on the Productive Safety Net Programme in eight woredas. Designed the endline household survey (2,400 households), anthropometric protocols and enumerator training, and ran the statistical analysis.$$, $$Found a 6-point reduction in stunting among children under two in treatment woredas; the Ministry of Health used the findings to extend the nutrition-sensitive design to four more regions.$$, $$https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-1-img1/900/600","caption":"Anthropometric measurement training for enumerators"},{"url":"https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-1-img2/900/600","caption":"Validation workshop with the regional health bureau"}]$$::jsonb, $$[{"label":"Evaluation summary","url":"https://example.org/amhara-psnp-nutrition-endline"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-hanna-tesfaye$$), $$SMART Nutrition Surveys in Pastoralist Woredas, Somali Region$$, $$Action Against Hunger$$, 2021, 2022, $$Survey Lead$$, $$Designed and supervised SMART surveys in five pastoralist woredas, including sampling around seasonal mobility, mobile data collection and quality control.$$, $$Surveys established the first comparable wasting estimates for the woredas and triggered an expansion of outpatient therapeutic programme sites.$$, $$https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-2-img1/900/600","caption":"Mobile data collection in a pastoralist kebele"}]$$::jsonb, $$[]$$::jsonb, 2),
  ((SELECT id FROM profiles WHERE handle = $$demo-hanna-tesfaye$$), $$Health Systems Readiness Assessment for Integrated Nutrition Services$$, $$Federal Ministry of Health, Ethiopia$$, 2019, 2020, $$Lead Researcher$$, $$Assessed staffing, therapeutic food supply chains, referral pathways and HMIS data quality in 60 primary health care facilities to inform integration of nutrition services into routine care.$$, $$Recommendations on supply forecasting and referral protocols were adopted in the national nutrition programme implementation manual.$$, $$https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-3/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-3-img1/900/600","caption":"Facility assessment at a health centre"},{"url":"https://picsum.photos/seed/demo-hanna-tesfaye-portfolio-3-img2/900/600","caption":"Review of growth-monitoring records"}]$$::jsonb, $$[]$$::jsonb, 3);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-abdiwali-hersi-warsame$$), $$Seasonal SMART Surveys, Somali Region of Ethiopia$$, $$Save the Children$$, 2022, 2024, $$Survey Manager$$, $$Led six rounds of SMART surveys in drought-affected woredas, including sampling design, anthropometric standardization tests and enumerator training in Somali.$$, $$Survey results informed the scale-up of outpatient therapeutic programme sites in three zones during the 2022–23 drought.$$, $$https://picsum.photos/seed/demo-abdiwali-hersi-warsame-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-abdiwali-hersi-warsame-portfolio-1-img1/900/600","caption":"Standardization test for MUAC measurement"},{"url":"https://picsum.photos/seed/demo-abdiwali-hersi-warsame-portfolio-1-img2/900/600","caption":"Enumerator training in Jigjiga"}]$$::jsonb, $$[{"label":"Survey summary","url":"https://example.org/somali-region-smart-2023"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-abdiwali-hersi-warsame$$), $$Nutrition Causal Analysis, Awdal and Togdheer$$, $$UNICEF Somalia$$, 2019, 2020, $$Field Research Lead$$, $$Combined household survey data and qualitative research with mothers and health workers to identify drivers of acute malnutrition in agro-pastoral communities.$$, $$Analysis led the nutrition cluster to add water trucking and infant feeding counselling to the regional response plan.$$, $$https://picsum.photos/seed/demo-abdiwali-hersi-warsame-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-abdiwali-hersi-warsame-portfolio-2-img1/900/600","caption":"Focus group with mothers in Awdal"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-meridian-health-analytics$$), $$Endline Evaluation, Maternal and Child Nutrition Programme, Kenya and Ethiopia$$, $$Children's Investment Fund Foundation$$, 2022, 2023, $$Evaluation Firm (lead)$$, $$Matched-comparison impact evaluation of a cross-border maternal and child nutrition programme, with a 3,000-household endline survey, anthropometry and a health facility assessment.$$, $$Measured significant gains in minimum acceptable diet and exclusive breastfeeding; findings shaped the funder's next five-year nutrition strategy for the Horn of Africa.$$, $$https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-1-img1/900/600","caption":"Field supervisors reviewing anthropometry data"},{"url":"https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-1-img2/900/600","caption":"Household interview in Marsabit"},{"url":"https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-1-img3/900/600","caption":"Dissemination meeting in Addis Ababa"}]$$::jsonb, $$[{"label":"Evaluation brief","url":"https://example.org/meridian-mcn-endline"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-meridian-health-analytics$$), $$Community Health Worker Cost-Effectiveness Study$$, $$Ministry of Health, Kenya$$, 2020, 2021, $$Research Partner$$, $$Costed community health worker services in four counties and modelled the cost-effectiveness of adding nutrition screening to routine household visits.$$, $$Costing model was adopted by the Ministry for county budgeting of community health services.$$, $$https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-2-img1/900/600","caption":"Costing workshop with county health teams"}]$$::jsonb, $$[]$$::jsonb, 2),
  ((SELECT id FROM profiles WHERE handle = $$demo-meridian-health-analytics$$), $$Nutrition HMIS Data Quality Audit, Somali Region$$, $$UNICEF Ethiopia$$, 2024, 2024, $$Audit Lead$$, $$Audited the completeness and accuracy of nutrition reporting from 85 health facilities and developed a data-quality dashboard for the regional health bureau.$$, $$Reporting completeness rose from 61% to 84% within two quarters of the dashboard going live.$$, $$https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-3/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-meridian-health-analytics-portfolio-3-img1/900/600","caption":"Data-quality dashboard training"}]$$::jsonb, $$[]$$::jsonb, 3);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-selamawit-girma$$), $$Impact Evaluation of Nutrition-Sensitive Cash Transfers, Oromia$$, $$IFPRI$$, 2021, 2023, $$Evaluation Analyst$$, $$Contributed to a quasi-experimental impact evaluation of nutrition-sensitive cash transfers, designing the household survey module on child anthropometry and diets and running the statistical analysis.$$, $$Evaluation showed improved dietary diversity among children in treatment households and fed into the redesign of the safety net's nutrition component.$$, $$https://picsum.photos/seed/demo-selamawit-girma-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-selamawit-girma-portfolio-1-img1/900/600","caption":"Enumerator training on anthropometry"},{"url":"https://picsum.photos/seed/demo-selamawit-girma-portfolio-1-img2/900/600","caption":"Household survey in Oromia"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-selamawit-girma$$), $$Growth Monitoring and Counselling Review, Somali Region$$, $$Alive & Thrive$$, 2018, 2019, $$Field Researcher$$, $$Reviewed how health extension workers deliver growth monitoring and infant feeding counselling in primary health care posts, combining observation and interviews with mothers.$$, $$Review led to a simplified counselling job aid used by health extension workers in the region.$$, $$https://picsum.photos/seed/demo-selamawit-girma-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-selamawit-girma-portfolio-2-img1/900/600","caption":"Observation at a health post"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-yonas-alemu$$), $$Impact Evaluation of Nutrition-Sensitive Cash Transfers, Amhara$$, $$Concern Worldwide$$, 2021, 2023, $$Evaluation Analyst$$, $$Contributed to a quasi-experimental impact evaluation of nutrition-sensitive cash transfers, designing the household survey module on child anthropometry and diets and running the statistical analysis.$$, $$Evaluation showed improved dietary diversity among children in treatment households and fed into the redesign of the safety net's nutrition component.$$, $$https://picsum.photos/seed/demo-yonas-alemu-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-yonas-alemu-portfolio-1-img1/900/600","caption":"Enumerator training on anthropometry"},{"url":"https://picsum.photos/seed/demo-yonas-alemu-portfolio-1-img2/900/600","caption":"Household survey in Amhara"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-yonas-alemu$$), $$Growth Monitoring and Counselling Review, Somali Region$$, $$Ethiopian Public Health Institute$$, 2018, 2019, $$Field Researcher$$, $$Reviewed how health extension workers deliver growth monitoring and infant feeding counselling in primary health care posts, combining observation and interviews with mothers.$$, $$Review led to a simplified counselling job aid used by health extension workers in the region.$$, $$https://picsum.photos/seed/demo-yonas-alemu-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-yonas-alemu-portfolio-2-img1/900/600","caption":"Observation at a health post"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-dawit-kebede-abate$$), $$Bus Rapid Transit Corridor Feasibility Study, Addis Ababa$$, $$Addis Ababa City Administration$$, 2016, 2018, $$Transport Planning Lead$$, $$Led demand modelling, corridor design options and operating plans for the city's first BRT corridor.$$, $$Preferred option advanced to detailed design with development bank financing.$$, $$https://picsum.photos/seed/demo-dawit-kebede-abate-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-dawit-kebede-abate-portfolio-1-img1/900/600","caption":"Corridor survey on Ring Road"},{"url":"https://picsum.photos/seed/demo-dawit-kebede-abate-portfolio-1-img2/900/600","caption":"Stakeholder consultation with minibus operators"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-dawit-kebede-abate$$), $$Municipal Road Safety Action Plans, Ethiopia$$, $$World Bank$$, 2021, 2022, $$Road Safety Specialist$$, $$Analysed crash data and prepared road safety action plans for three secondary cities, including speed management and safer school zones.$$, $$Plans adopted by the three city councils; speed management pilots launched near twelve schools.$$, $$https://picsum.photos/seed/demo-dawit-kebede-abate-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-dawit-kebede-abate-portfolio-2-img1/900/600","caption":"Safer school zone pilot"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-nusrat-jahan-chowdhury$$), $$Endline Evaluation of Nutrition-Sensitive Cash Transfers, Ethiopia$$, $$World Food Programme$$, 2022, 2023, $$Evaluation Team Leader$$, $$Led a difference-in-differences endline impact evaluation of nutrition-sensitive cash transfers in Amhara and the Somali region, with a household survey of 2,000 households and anthropometric measurement of children under five.$$, $$Evaluation found reduced wasting during the lean season and informed WFP's decision to make the transfers seasonal.$$, $$https://picsum.photos/seed/demo-nusrat-jahan-chowdhury-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-nusrat-jahan-chowdhury-portfolio-1-img1/900/600","caption":"Enumerator training in Jigjiga"},{"url":"https://picsum.photos/seed/demo-nusrat-jahan-chowdhury-portfolio-1-img2/900/600","caption":"Endline results workshop in Addis Ababa"}]$$::jsonb, $$[{"label":"Evaluation summary","url":"https://example.org/wfp-ethiopia-nsct-endline"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-nusrat-jahan-chowdhury$$), $$Randomized Evaluation of Infant Feeding Counselling, Bangladesh$$, $$icddr,b$$, 2015, 2018, $$Principal Investigator$$, $$Designed and led a cluster-randomized impact evaluation of counselling delivered by community health workers, including survey design and statistical analysis.$$, $$Counselling improved minimum dietary diversity by 12 percentage points; the model was adopted into the national nutrition services package.$$, $$https://picsum.photos/seed/demo-nusrat-jahan-chowdhury-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-nusrat-jahan-chowdhury-portfolio-2-img1/900/600","caption":"Community health worker counselling session"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-lucia-barrios-cifuentes$$), $$Integrity Assessment of Emergency Procurement, Guatemala and Honduras$$, $$Inter-American Development Bank$$, 2021, 2022, $$Team Leader$$, $$Assessed corruption risks in COVID-19 emergency procurement in both countries, combining legal review, red-flag analysis of portal data and interviews with auditors and bidders.$$, $$Recommendations on publishing emergency contracts within 72 hours were adopted by both procurement authorities.$$, $$https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-1-img1/900/600","caption":"Workshop with the supreme audit institution"},{"url":"https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-1-img2/900/600","caption":"Red-flag dashboard review"}]$$::jsonb, $$[{"label":"Assessment summary","url":"https://example.org/ca-emergency-procurement"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-lucia-barrios-cifuentes$$), $$Open Contracting Implementation Roadmap, Honduras$$, $$Open Contracting Partnership$$, 2019, 2020, $$Lead Consultant$$, $$Prepared the roadmap for publishing HonduCompras data in the Open Contracting Data Standard and set up a civil-society monitoring pilot for road contracts.$$, $$HonduCompras began publishing OCDS data for all national-level tenders.$$, $$https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-2-img1/900/600","caption":"Civil-society monitoring training"}]$$::jsonb, $$[]$$::jsonb, 2),
  ((SELECT id FROM profiles WHERE handle = $$demo-lucia-barrios-cifuentes$$), $$Social Audit of Municipal Public Works, Quetzaltenango$$, $$USAID$$, 2016, 2017, $$Citizen Engagement Advisor$$, $$Designed a social audit model in which community committees monitor municipal public works contracts and report to the auditor.$$, $$Model rolled out to 14 municipalities; committees flagged cost overruns on four contracts.$$, $$https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-3/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lucia-barrios-cifuentes-portfolio-3-img1/900/600","caption":"Community committee site visit"}]$$::jsonb, $$[]$$::jsonb, 3);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-andres-castillo-zelaya$$), $$Health Sector Procurement Red-Flag Analysis, Honduras$$, $$Transparency International$$, 2022, 2023, $$Lead Data Analyst$$, $$Built red-flag indicators (single bidding, direct awards, contract amendments) from five years of health sector procurement data and linked suppliers to the company registry.$$, $$Analysis identified supplier networks behind 40% of direct awards and was cited by the supreme audit institution in two audits.$$, $$https://picsum.photos/seed/demo-andres-castillo-zelaya-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-andres-castillo-zelaya-portfolio-1-img1/900/600","caption":"Supplier network visualization"},{"url":"https://picsum.photos/seed/demo-andres-castillo-zelaya-portfolio-1-img2/900/600","caption":"Presentation to journalists"}]$$::jsonb, $$[{"label":"Data story","url":"https://example.org/honduras-health-procurement"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-andres-castillo-zelaya$$), $$Open Contracting Dashboard for Public Works$$, $$CoST Honduras$$, 2020, 2021, $$Data Developer$$, $$Developed a public dashboard of public works contracts published in the Open Contracting Data Standard, including contract amendments and cost overruns.$$, $$Dashboard used by citizen monitors in eight municipalities.$$, $$https://picsum.photos/seed/demo-andres-castillo-zelaya-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-andres-castillo-zelaya-portfolio-2-img1/900/600","caption":"Public works dashboard"}]$$::jsonb, $$[]$$::jsonb, 2);

COMMIT;
