-- 007 (part 1 of 4): synthetic demo profiles — GENERATED, do not edit by hand.
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

-- Kwabena Owusu-Ansah (demo-kwabena-owusu-ansah)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'c2632427-9fab-55ae-b85f-a8fdec962a91',
  NULL,
  $$Individual$$,
  $$demo-kwabena-owusu-ansah$$,
  $$Kwabena Owusu-Ansah$$,
  $$Energy Finance Specialist | Mini-Grids, Renewable Energy & Energy Efficiency | Ghana & West Africa$$,
  $$Accra, Ghana$$,
  $$mid_career$$,
  NULL,
  $$Ghanaian citizen; contracts as an individual or through Owusu-Ansah Energy Advisory Ltd. Free movement within ECOWAS.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 90)::text, 'until', NULL),
  now() - interval '17 days',
  $$https://i.pravatar.cc/150?u=demo-kwabena-owusu-ansah$$,
  $$https://picsum.photos/seed/demo-kwabena-owusu-ansah/800/200$$,
  $$Kwabena Owusu-Ansah is an energy finance specialist with eleven years of experience structuring renewable energy and energy efficiency investments in Ghana, Nigeria and Sierra Leone. He builds financial models for solar mini-grids, commercial rooftop solar and efficient cooling programmes, and helps developers and public utilities prepare projects for blended finance. He has worked with the Energy Commission of Ghana on tariff studies for mini-grids and with climate funds on results-based financing for clean energy access. Kwabena also writes policy analysis on subsidy reform and climate mitigation targets, and manages multi-country project preparation teams.$$,
  $$[{"name":"Renewable Energy","tier":"primary","level":"item"},{"name":"Energy Efficiency","tier":"secondary","level":"item"},{"name":"Climate Mitigation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"},{"name":"Policy Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Chartered Financial Analyst (CFA)","issuing_organization":"CFA Institute","year":2017,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Twi$$]::text[],
  $$[{"organization":"Independent consultant","role":"Energy Finance Specialist","start_year":2021,"end_year":null,"logo_url":null,"description":"Project preparation and financial modeling for clean energy developers and funds."},{"organization":"Energy Commission of Ghana","role":"Senior Analyst, Renewable Energy","start_year":2016,"end_year":2021,"logo_url":null,"description":"Tariff and regulatory studies for mini-grids and net metering."},{"organization":"Ecobank Ghana","role":"Credit Analyst","start_year":2014,"end_year":2016,"logo_url":null,"description":"Appraised energy and infrastructure loans."}]$$::jsonb,
  $$[{"institution":"Kwame Nkrumah University of Science and Technology","degree_or_course":"MSc Renewable Energy Technologies","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Fatmata Kamara (demo-fatmata-kamara)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'da0913e7-f927-5b24-bd8a-2d447aac7d81',
  NULL,
  $$Individual$$,
  $$demo-fatmata-kamara$$,
  $$Fatmata Kamara$$,
  $$Agricultural Research Officer | Sustainable Farming & Farmer Surveys | Sierra Leone$$,
  $$Freetown, Sierra Leone$$,
  $$early_career$$,
  NULL,
  $$Sierra Leonean citizen; contracts as an individual.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 90)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '230 days',
  $$https://i.pravatar.cc/150?u=demo-fatmata-kamara$$,
  $$https://picsum.photos/seed/demo-fatmata-kamara/800/200$$,
  $$Fatmata Kamara is an agricultural research officer with four years of experience on sustainable farming and food security in Sierra Leone. She has coordinated farmer field school surveys on rice and cassava, mapped plot boundaries with GPS and QGIS for a land-use study, and supported the evaluation of an inland valley swamp rehabilitation project. She designs short survey questionnaires on tablets, trains enumerators, and writes field reports for district agricultural offices. Fatmata is interested in agroecology and climate-smart practices that reduce slash-and-burn clearing on upland farms.$$,
  $$[{"name":"Sustainable Farming","tier":"primary","level":"item"},{"name":"Food Security","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Survey Design","tier":"primary","level":"item"},{"name":"GIS Mapping","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Krio$$]::text[],
  $$[{"organization":"Sierra Leone Agricultural Research Institute","role":"Research Officer","start_year":2022,"end_year":2025,"logo_url":null,"description":"Farmer field school surveys and land-use mapping."},{"organization":"Welthungerhilfe Sierra Leone","role":"Field Assistant","start_year":2020,"end_year":2022,"logo_url":null,"description":"Supported smallholder agriculture programmes in Kailahun."}]$$::jsonb,
  $$[{"institution":"Njala University","degree_or_course":"BSc Agriculture","start_year":2015,"end_year":2019,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Aisha Bello Danjuma (demo-aisha-bello-danjuma)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '44e07947-c847-5be7-a38c-04e1acb6057b',
  NULL,
  $$Individual$$,
  $$demo-aisha-bello-danjuma$$,
  $$Aisha Bello Danjuma$$,
  $$Basic Education & Teacher Training Expert | Curriculum, ToT & E-Learning | Northern Nigeria$$,
  $$Kano, Nigeria$$,
  $$senior$$,
  NULL,
  $$Nigerian citizen; contracts as an individual or through her registered education consultancy in Kano.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '9 days',
  $$https://i.pravatar.cc/150?u=demo-aisha-bello-danjuma$$,
  $$https://picsum.photos/seed/demo-aisha-bello-danjuma/800/200$$,
  $$Aisha Bello Danjuma has worked on primary education in northern Nigeria for twenty years, as a teacher, a state education official and a consultant. She has designed structured pedagogy curricula for early grade reading in Hausa, built training of trainers cascades that reached thousands of teachers, and adapted lessons for Islamiyya and Tsangaya schools that integrate basic literacy and numeracy. During school closures she led the development of radio and e-learning content for the state ministry. Aisha's work puts girls' education and gender mainstreaming at the centre, from female teacher recruitment to safe school environments, and she monitors learning outcomes with simple assessments that teachers can use.$$,
  $$[{"name":"Primary Education","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Curriculum Design","tier":"primary","level":"item"},{"name":"Training of Trainers","tier":"primary","level":"item"},{"name":"E-Learning Development","tier":"secondary","level":"item"},{"name":"Monitoring & Evaluation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Hausa$$, $$Arabic$$]::text[],
  $$[{"organization":"Independent consultant","role":"Education Specialist","start_year":2017,"end_year":null,"logo_url":null,"description":"Curriculum and teacher development for donors and state ministries in northern Nigeria."},{"organization":"Kano State Universal Basic Education Board","role":"Director of Teacher Development","start_year":2010,"end_year":2017,"logo_url":null,"description":"Led in-service teacher training across 44 local government areas."},{"organization":"Government Girls Secondary School, Kano","role":"Teacher","start_year":2004,"end_year":2010,"logo_url":null,"description":"Taught English and mentored new teachers."}]$$::jsonb,
  $$[{"institution":"Bayero University Kano","degree_or_course":"MEd Curriculum Studies","start_year":2007,"end_year":2009,"logo_url":null},{"institution":"Bayero University Kano","degree_or_course":"BA Education (English)","start_year":2000,"end_year":2004,"logo_url":null}]$$::jsonb,
  $$[{"organization":"Federation of Muslim Women's Associations in Nigeria","role":"Education committee member","start_year":2015,"end_year":null,"description":"Advises on girls' education campaigns."}]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Chidi Okonkwo-Nwosu (demo-chidi-okonkwo-nwosu)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '6ab3688d-135d-5f89-b4f8-32ba25129b2a',
  NULL,
  $$Individual$$,
  $$demo-chidi-okonkwo-nwosu$$,
  $$Chidi Okonkwo-Nwosu$$,
  $$Entrepreneurship Ecosystems & SME Specialist | Startup Support, Market Research | Nigeria$$,
  $$Lagos, Nigeria$$,
  $$mid_career$$,
  NULL,
  $$Nigerian citizen; contracts as an individual or through a registered business name (CAC).$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date + 200)::text),
  now() - interval '60 days',
  $$https://i.pravatar.cc/150?u=demo-chidi-okonkwo-nwosu$$,
  $$https://picsum.photos/seed/demo-chidi-okonkwo-nwosu/800/200$$,
  $$Chidi Okonkwo-Nwosu works on innovation ecosystems and SME growth in Nigeria and West Africa. Over ten years he has run accelerator programmes for tech start-ups, designed business development services for small manufacturers, and carried out market research on access to finance for young entrepreneurs. He has advised state governments on innovation hubs and start-up regulation, and helped a microfinance bank launch a mobile app for SME loans. Chidi is a skilled facilitator who brings founders, investors and officials together, and he mentors early-stage entrepreneurs in Lagos and Enugu.$$,
  $$[{"name":"Innovation Ecosystems","tier":"primary","level":"item"},{"name":"SME Support","tier":"primary","level":"item"},{"name":"Financial Inclusion","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Mobile App Development","tier":"secondary","level":"item"},{"name":"Stakeholder Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Igbo$$, $$Yoruba$$]::text[],
  $$[{"organization":"Independent consultant","role":"SME and Innovation Advisor","start_year":2020,"end_year":null,"logo_url":null,"description":"Ecosystem and SME programmes for donors and state governments."},{"organization":"Ventures Platform (accelerator)","role":"Programme Manager","start_year":2016,"end_year":2020,"logo_url":null,"description":"Ran accelerator cohorts for early-stage start-ups."}]$$::jsonb,
  $$[{"institution":"University of Nigeria, Nsukka","degree_or_course":"BSc Economics","start_year":2009,"end_year":2013,"logo_url":null},{"institution":"Lagos Business School","degree_or_course":"MBA","start_year":2017,"end_year":2019,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Mariam Traoré (demo-mariam-traore)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'a1704511-bb1b-5b3e-970a-a23ca04d6d8d',
  NULL,
  $$Individual$$,
  $$demo-mariam-traore$$,
  $$Mariam Traoré$$,
  $$Food Security & Humanitarian M&E Specialist | Surveys & Resilience | Mali & the Sahel$$,
  $$Bamako, Mali$$,
  $$senior$$,
  NULL,
  $$Malian citizen; contracts as an individual or through her SARL in Bamako. Free movement within ECOWAS/WAEMU.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '11 days',
  $$https://i.pravatar.cc/150?u=demo-mariam-traore$$,
  $$https://picsum.photos/seed/demo-mariam-traore/800/200$$,
  $$Mariam Traoré has spent seventeen years on food security and humanitarian programmes in Mali, Burkina Faso and Niger. She has designed monitoring and evaluation systems for resilience programmes, led food security and livelihoods surveys using the Cadre Harmonisé and HEA methods, and evaluated cash transfer and early-warning projects. She works closely with government food security systems and with farmer and women's groups in conflict-affected areas where access is difficult, using remote monitoring and local enumerator networks. Mariam is known for clear statistical analysis and for evaluation reports that lead to practical changes in targeting and timing of assistance.$$,
  $$[{"name":"Food Security","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"primary","level":"item"},{"name":"Rural Development","tier":"secondary","level":"item"},{"name":"Climate Adaptation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Monitoring & Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$Bambara$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Food Security and M&E Specialist","start_year":2016,"end_year":null,"logo_url":null,"description":"Evaluations and surveys for UN agencies and NGOs in the Sahel."},{"organization":"World Food Programme Mali","role":"VAM Officer","start_year":2010,"end_year":2016,"logo_url":null,"description":"Led food security assessments and market monitoring."},{"organization":"Système d'Alerte Précoce, Mali","role":"Analyst","start_year":2007,"end_year":2010,"logo_url":null,"description":"Early warning analysis for the national food security system."}]$$::jsonb,
  $$[{"institution":"Université de Bamako","degree_or_course":"Maîtrise en Économie","start_year":2002,"end_year":2006,"logo_url":null},{"institution":"Université Paris 1 Panthéon-Sorbonne","degree_or_course":"Master Développement Agricole","start_year":2008,"end_year":2009,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Grace Wanjiru Kamau (demo-grace-wanjiru-kamau)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'bcf1b059-1569-5cfd-b134-3f80c6d5f9a7',
  NULL,
  $$Individual$$,
  $$demo-grace-wanjiru-kamau$$,
  $$Grace Wanjiru Kamau$$,
  $$Climate Adaptation Policy Writer | Water & WASH Resilience | Kenya & East Africa$$,
  $$Nairobi, Kenya$$,
  $$mid_career$$,
  NULL,
  $$Kenyan citizen; contracts as an individual consultant (KRA PIN registered).$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '24 days',
  $$https://i.pravatar.cc/150?u=demo-grace-wanjiru-kamau$$,
  $$https://picsum.photos/seed/demo-grace-wanjiru-kamau/800/200$$,
  $$Grace Wanjiru Kamau writes and advises on climate adaptation policy in Kenya and East Africa. Over nine years she has drafted county climate change action plans, policy briefs on drought resilience and water management, and the adaptation chapters of national reports to the UNFCCC. She translates technical research on groundwater, rainfall variability and WASH services into clear options for county governments and parliamentarians, and facilitates consultations with pastoralist communities and water user associations. Grace previously worked as a research communications officer at a regional climate centre.$$,
  $$[{"name":"Climate Adaptation","tier":"primary","level":"item"},{"name":"Water Management","tier":"secondary","level":"item"},{"name":"WASH","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Briefs","tier":"primary","level":"item"},{"name":"Technical Writing","tier":"secondary","level":"item"},{"name":"Stakeholder Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Swahili$$]::text[],
  $$[{"organization":"Independent consultant","role":"Climate Policy Writer","start_year":2020,"end_year":null,"logo_url":null,"description":"Policy writing and consultations for county governments and development partners."},{"organization":"IGAD Climate Prediction and Applications Centre","role":"Research Communications Officer","start_year":2016,"end_year":2020,"logo_url":null,"description":"Produced policy briefs from regional climate research."}]$$::jsonb,
  $$[{"institution":"University of Nairobi","degree_or_course":"MA Environmental Policy","start_year":2014,"end_year":2016,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Aline Uwimana (demo-aline-uwimana)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '78078601-d739-5415-8ed7-42d8100ddf84',
  NULL,
  $$Individual$$,
  $$demo-aline-uwimana$$,
  $$Aline Uwimana$$,
  $$Digital Learning Designer | E-Learning & Curriculum for Universities and TVET | Rwanda$$,
  $$Kigali, Rwanda$$,
  $$early_career$$,
  NULL,
  $$Rwandan citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '6 days',
  $$https://i.pravatar.cc/150?u=demo-aline-uwimana$$,
  $$https://picsum.photos/seed/demo-aline-uwimana/800/200$$,
  $$Aline Uwimana is a digital learning designer with five years of experience in tertiary education and technical training in Rwanda. She has designed e-learning courses and blended curricula for a public university and TVET colleges, built course sites on Moodle, and trained lecturers to create their own online materials. She is interested in how universities and innovation hubs can teach practical digital and entrepreneurial skills, and has helped build small web tools for course registration and student feedback. Aline works in Kinyarwanda, English and French and is completing a master's in educational technology.$$,
  $$[{"name":"Tertiary Education","tier":"primary","level":"item"},{"name":"Innovation Ecosystems","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"E-Learning Development","tier":"primary","level":"item"},{"name":"Curriculum Design","tier":"primary","level":"item"},{"name":"Web Development","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Kinyarwanda$$, $$English$$, $$French$$]::text[],
  $$[{"organization":"University of Rwanda","role":"E-Learning Officer","start_year":2021,"end_year":null,"logo_url":null,"description":"Designs online and blended courses and trains lecturers."},{"organization":"kLab Rwanda","role":"Programme Assistant","start_year":2019,"end_year":2021,"logo_url":null,"description":"Supported training programmes at the innovation hub."}]$$::jsonb,
  $$[{"institution":"University of Rwanda","degree_or_course":"BSc Computer Science","start_year":2015,"end_year":2019,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Achieng Otieno (demo-achieng-otieno)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'dd526446-acdd-5e22-b584-551fcd5a84ca',
  NULL,
  $$Individual$$,
  $$demo-achieng-otieno$$,
  $$Achieng Otieno$$,
  $$Graphic Designer for Development | Infographics, Reports & Visual Identity | East Africa$$,
  $$Nairobi, Kenya$$,
  $$early_career$$,
  NULL,
  $$Kenyan citizen; invoices as a sole proprietor.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '45 days',
  $$https://i.pravatar.cc/150?u=demo-achieng-otieno$$,
  $$https://picsum.photos/seed/demo-achieng-otieno/800/200$$,
  $$Achieng Otieno is a graphic designer who works almost entirely with development organizations. In five years she has designed annual reports, research publications and infographic series for NGOs, UN agencies and think tanks across East Africa, and created visual identities for two community health campaigns. She takes dense data on climate, health and education and turns it into charts, icons and layouts that work in print and on social media. She also shoots field photography and short motion graphics for campaign launches. Achieng is quick, organized and comfortable working to tight publication deadlines.$$,
  $$[{"name":"Climate & Environment","tier":"secondary","level":"category"},{"name":"Human Development","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Infographics","tier":"primary","level":"item"},{"name":"Publication Layout","tier":"primary","level":"item"},{"name":"Brand Identity","tier":"secondary","level":"item"},{"name":"Photography","tier":"secondary","level":"item"},{"name":"Motion Graphics","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Swahili$$]::text[],
  $$[{"organization":"Freelance","role":"Graphic Designer","start_year":2022,"end_year":null,"logo_url":null,"description":"Publications, infographics and brand work for development organizations."},{"organization":"Africa Population and Health Research Center","role":"Communications Designer","start_year":2020,"end_year":2022,"logo_url":null,"description":"Designed research publications and data visualizations."}]$$::jsonb,
  $$[{"institution":"Kenyatta University","degree_or_course":"BA Fine Art and Design","start_year":2015,"end_year":2019,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Celso Mabunda (demo-celso-mabunda)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '48326172-4dfb-5062-acb1-ee44eb766ee2',
  NULL,
  $$Individual$$,
  $$demo-celso-mabunda$$,
  $$Celso Mabunda$$,
  $$Portuguese–English Interpreter & Translator | Humanitarian & Development Settings | Mozambique$$,
  $$Maputo, Mozambique$$,
  $$senior$$,
  NULL,
  $$Mozambican citizen; contracts as an individual (NUIT registered).$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '15 days',
  $$https://i.pravatar.cc/150?u=demo-celso-mabunda$$,
  $$https://picsum.photos/seed/demo-celso-mabunda/800/200$$,
  $$Celso Mabunda is a conference interpreter and translator with sixteen years of experience in development and humanitarian settings in Mozambique and Lusophone Africa. He has interpreted for government–donor dialogues, cyclone recovery coordination meetings and community consultations in Cabo Delgado, and translates evaluation reports, project documents and training materials between Portuguese and English. He also leads localization of humanitarian messages into Tsonga and other local languages with community translators. Celso is accustomed to field conditions and sensitive conversations, including with displaced families and survivors of violence.$$,
  $$[{"name":"Humanitarian Aid","tier":"primary","level":"item"},{"name":"Post-Conflict Reconstruction","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Interpretation","tier":"primary","level":"item"},{"name":"Translation","tier":"primary","level":"item"},{"name":"Localization","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Member, Associação Moçambicana de Tradutores e Intérpretes","issuing_organization":"AMOTI","year":2012,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Portuguese$$, $$English$$, $$Tsonga$$]::text[],
  $$[{"organization":"Freelance","role":"Interpreter and Translator","start_year":2013,"end_year":null,"logo_url":null,"description":"Interpreting and translation for UN agencies, donors and government."},{"organization":"Instituto Nacional de Gestão e Redução do Risco de Desastres","role":"Translator","start_year":2009,"end_year":2013,"logo_url":null,"description":"Translated disaster management documents and coordination materials."}]$$::jsonb,
  $$[{"institution":"Universidade Eduardo Mondlane","degree_or_course":"Licenciatura em Tradução e Interpretação","start_year":2004,"end_year":2008,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Grâce Mbuyi Tshimanga (demo-grace-mbuyi-tshimanga)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '9c516d30-13a6-5c47-a8ec-a90b60c0ba12',
  NULL,
  $$Individual$$,
  $$demo-grace-mbuyi-tshimanga$$,
  $$Grâce Mbuyi Tshimanga$$,
  $$GBV & Peacebuilding Specialist | Survivor-Centred Research & Advocacy | Eastern DRC & Great Lakes$$,
  $$Goma, Democratic Republic of the Congo$$,
  $$senior$$,
  NULL,
  $$Congolese citizen; contracts as an individual or through her registered ASBL. Can work in Rwanda and Burundi on short missions.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  now() - interval '10 days',
  $$https://i.pravatar.cc/150?u=demo-grace-mbuyi-tshimanga$$,
  $$https://picsum.photos/seed/demo-grace-mbuyi-tshimanga/800/200$$,
  $$Grâce Mbuyi Tshimanga has worked on gender-based violence and peacebuilding in eastern DRC and the Great Lakes for eighteen years. She has led survivor-centred qualitative research on sexual violence in conflict, evaluated GBV response and community dialogue programmes, and advised UN missions and NGOs on linking protection to local peace processes. She trains researchers in trauma-informed interviewing and ethics, and has run national advocacy campaigns on survivors' access to justice and reparations. Grâce works in French, Swahili and Lingala and has deep networks with women's organizations in North and South Kivu.$$,
  $$[{"name":"Gender-Based Violence","tier":"primary","level":"item"},{"name":"Peacebuilding","tier":"primary","level":"item"},{"name":"Post-Conflict Reconstruction","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Advocacy Campaigns","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$Swahili$$, $$Lingala$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"GBV and Peacebuilding Specialist","start_year":2017,"end_year":null,"logo_url":null,"description":"Research and evaluations for UN agencies and NGOs in the Great Lakes."},{"organization":"International Alert DRC","role":"Programme Manager, Gender and Peacebuilding","start_year":2011,"end_year":2017,"logo_url":null,"description":"Led community dialogue and women's participation programmes."},{"organization":"Synergie des Femmes pour les Victimes des Violences Sexuelles","role":"Coordinator","start_year":2006,"end_year":2011,"logo_url":null,"description":"Coordinated survivor support services in North Kivu."}]$$::jsonb,
  $$[{"institution":"Université Libre des Pays des Grands Lacs","degree_or_course":"Licence en Psychologie","start_year":2001,"end_year":2005,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Hervé Nkeng Tabi (demo-herve-nkeng-tabi)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'ac238e45-6682-5805-8c7e-6425cf64b527',
  NULL,
  $$Individual$$,
  $$demo-herve-nkeng-tabi$$,
  $$Hervé Nkeng Tabi$$,
  $$Biodiversity & Forest Mapping Specialist | GIS, Community Forestry | Cameroon & Congo Basin$$,
  $$Yaoundé, Cameroon$$,
  $$mid_career$$,
  NULL,
  $$Cameroonian citizen; contracts as an individual consultant.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date + 240)::text),
  now() - interval '75 days',
  $$https://i.pravatar.cc/150?u=demo-herve-nkeng-tabi$$,
  $$https://picsum.photos/seed/demo-herve-nkeng-tabi/800/200$$,
  $$Hervé Nkeng Tabi is a biodiversity and forest mapping specialist with ten years of experience in Cameroon and the Congo Basin. He produces GIS maps of forest cover, community forests and wildlife corridors, and has supported participatory mapping with Baka and Bagyeli Indigenous Peoples to document customary land use. His work has fed into protected area management plans, deforestation-free cocoa supply chain studies and sustainable farming projects around forest edges. Hervé facilitates village meetings in French and English and trains forest guards and NGO staff in GPS data collection.$$,
  $$[{"name":"Biodiversity","tier":"primary","level":"item"},{"name":"Indigenous Peoples","tier":"secondary","level":"item"},{"name":"Sustainable Farming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"GIS Mapping","tier":"primary","level":"item"},{"name":"Stakeholder Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$French$$, $$English$$]::text[],
  $$[{"organization":"WWF Cameroon","role":"GIS and Biodiversity Officer","start_year":2018,"end_year":2024,"logo_url":null,"description":"Mapping and monitoring for protected areas in the south-east."},{"organization":"Centre for Environment and Development","role":"Participatory Mapping Officer","start_year":2015,"end_year":2018,"logo_url":null,"description":"Community mapping with forest communities."}]$$::jsonb,
  $$[{"institution":"University of Dschang","degree_or_course":"MSc Forestry","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Achta Mahamat Saleh (demo-achta-mahamat-saleh)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '320b21bb-03d8-5bd1-b545-bd898ce9f2a0',
  NULL,
  $$Individual$$,
  $$demo-achta-mahamat-saleh$$,
  $$Achta Mahamat Saleh$$,
  $$Humanitarian Field Researcher | Refugee Surveys & Food Security | Eastern Chad$$,
  $$N'Djamena, Chad$$,
  $$early_career$$,
  NULL,
  $$Chadian citizen; contracts as an individual.$$,
  ARRAY[$$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 150)::text),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 60)::text),
  now() - interval '300 days',
  $$https://i.pravatar.cc/150?u=demo-achta-mahamat-saleh$$,
  $$https://picsum.photos/seed/demo-achta-mahamat-saleh/800/200$$,
  $$Achta Mahamat Saleh is a humanitarian field researcher with four years of experience in eastern Chad, where she has worked in refugee camps hosting Sudanese refugees. She has supervised household surveys on food security and protection, conducted interviews in Chadian Arabic and French, and interpreted for assessment teams. She is skilled in mobile data collection with KoBoToolbox and in organizing enumerator teams under difficult logistics. Achta is eager to grow into a research and monitoring role with humanitarian or development agencies.$$,
  $$[{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"secondary","level":"item"},{"name":"Food Security","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Interpretation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$French$$, $$English$$]::text[],
  $$[{"organization":"REACH Initiative Chad","role":"Field Assessment Officer","start_year":2022,"end_year":2025,"logo_url":null,"description":"Household surveys in refugee camps in Ouaddaï."},{"organization":"Chadian Red Cross","role":"Volunteer Coordinator","start_year":2020,"end_year":2022,"logo_url":null,"description":"Coordinated volunteers during refugee arrivals."}]$$::jsonb,
  $$[{"institution":"Université de N'Djamena","degree_or_course":"Licence en Sociologie","start_year":2016,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Edvânia Kiala (demo-edvania-kiala)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'edbe8a19-f5df-5783-9eb3-271e5edb711d',
  NULL,
  $$Individual$$,
  $$demo-edvania-kiala$$,
  $$Edvânia Kiala$$,
  $$Investment Climate Analyst | PPPs & Trade Policy | Angola & Lusophone Africa$$,
  $$Luanda, Angola$$,
  $$early_career$$,
  NULL,
  $$Angolan citizen; contracts as an individual consultant.$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '21 days',
  $$https://i.pravatar.cc/150?u=demo-edvania-kiala$$,
  $$https://picsum.photos/seed/demo-edvania-kiala/800/200$$,
  $$Edvânia Kiala is an investment climate analyst with four years of experience in Angola and Lusophone Africa. She has supported diagnostics of business regulation and trade facilitation, built financial models for public-private partnership projects in water and logistics, and drafted policy notes on economic diversification away from oil. She previously worked in the PPP unit of the Ministry of Finance, where she reviewed project feasibility studies and value-for-money assessments. Edvânia works in Portuguese and English and is building expertise in investment promotion and special economic zones.$$,
  $$[{"name":"Investment Climate","tier":"primary","level":"item"},{"name":"Public-Private Partnerships","tier":"secondary","level":"item"},{"name":"Trade & Competitiveness","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Policy Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Portuguese$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Investment Climate Analyst","start_year":2024,"end_year":null,"logo_url":null,"description":"Diagnostics and PPP analysis for development partners."},{"organization":"Ministério das Finanças de Angola, PPP Unit","role":"Analyst","start_year":2021,"end_year":2024,"logo_url":null,"description":"Reviewed PPP feasibility studies and value-for-money assessments."}]$$::jsonb,
  $$[{"institution":"Universidade Agostinho Neto","degree_or_course":"Licenciatura em Economia","start_year":2016,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Kopano Communications (demo-kopano-communications)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'e097383c-cb95-5236-91e9-2d40a5ef2847',
  NULL,
  $$Small Firm$$,
  $$demo-kopano-communications$$,
  $$Kopano Communications$$,
  $$Development Communications Agency | Advocacy Campaigns, Media Relations & Content | Southern Africa$$,
  $$Johannesburg, South Africa$$,
  NULL,
  2010,
  $$Registered in South Africa (Pty) Ltd, Level 1 B-BBEE contributor. Contracts as a firm across SADC.$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '4 days',
  $$https://i.pravatar.cc/150?u=demo-kopano-communications$$,
  $$https://picsum.photos/seed/demo-kopano-communications/800/200$$,
  $$Kopano Communications is a Johannesburg agency of sixteen communicators that works only on social and development issues. Since 2010 it has run advocacy campaigns on gender equality, social grants, youth employment and public health for foundations, UN agencies and civil-society coalitions across Southern Africa. The team handles campaign strategy, media relations, speechwriting for public figures, copywriting, social media and public outreach events, and produces content in English, Zulu, Sotho and Afrikaans. Kopano is known for campaigns that put the voices of affected communities at the front rather than the organizations behind them.$$,
  $$[{"name":"Gender & Social Inclusion","tier":"primary","level":"category"},{"name":"Human Development","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Media Relations","tier":"primary","level":"item"},{"name":"Advocacy Campaigns","tier":"primary","level":"item"},{"name":"Speechwriting","tier":"secondary","level":"item"},{"name":"Social Media","tier":"secondary","level":"item"},{"name":"Public Outreach","tier":"secondary","level":"item"},{"name":"Copywriting","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Zulu$$, $$Sotho$$, $$Afrikaans$$]::text[],
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

-- Lerato Mokoena (demo-lerato-mokoena)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '565532b7-ac77-5b48-a69b-ea3008f79ae3',
  NULL,
  $$Individual$$,
  $$demo-lerato-mokoena$$,
  $$Lerato Mokoena$$,
  $$Social Protection Policy Analyst | Grants, Disability Inclusion & Microsimulation | South Africa$$,
  $$Cape Town, South Africa$$,
  $$senior$$,
  NULL,
  $$South African citizen; contracts as an individual or through a registered CC.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '50 days',
  $$https://i.pravatar.cc/150?u=demo-lerato-mokoena$$,
  $$https://picsum.photos/seed/demo-lerato-mokoena/800/200$$,
  $$Lerato Mokoena is a social protection policy analyst with sixteen years of experience in South Africa and the SADC region. She models the cost and poverty impact of social grants with tax-benefit microsimulation, has evaluated disability grant assessment processes, and advises treasury and social development officials on reform options. Her statistical analysis work in R and Stata draws on household and labour force surveys, and she writes for both technical and political audiences. Lerato has worked with the National Treasury, UNICEF and the ILO, and has a particular interest in disability inclusion in social protection systems.$$,
  $$[{"name":"Social Protection","tier":"primary","level":"item"},{"name":"Disability Inclusion","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Analysis","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"primary","level":"item"},{"name":"Python/R","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Afrikaans$$, $$Xhosa$$]::text[],
  $$[{"organization":"Independent consultant","role":"Social Protection Analyst","start_year":2018,"end_year":null,"logo_url":null,"description":"Policy analysis and microsimulation for government and UN agencies."},{"organization":"Southern Africa Labour and Development Research Unit, University of Cape Town","role":"Senior Researcher","start_year":2010,"end_year":2018,"logo_url":null,"description":"Research on social grants and poverty."}]$$::jsonb,
  $$[{"institution":"University of Cape Town","degree_or_course":"MCom Economics","start_year":2006,"end_year":2008,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Onalenna Kgosietsile (demo-onalenna-kgosietsile)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'da399b2c-2d36-5ca1-8aca-84c15740d4db',
  NULL,
  $$Individual$$,
  $$demo-onalenna-kgosietsile$$,
  $$Onalenna Kgosietsile$$,
  $$Water Data Scientist | Hydrological Modelling, Python & GIS | Botswana & Southern Africa$$,
  $$Gaborone, Botswana$$,
  $$early_career$$,
  NULL,
  $$Motswana citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '2 days',
  $$https://i.pravatar.cc/150?u=demo-onalenna-kgosietsile$$,
  $$https://picsum.photos/seed/demo-onalenna-kgosietsile/800/200$$,
  $$Onalenna Kgosietsile is a data scientist working on water management and climate adaptation in Botswana and the Limpopo basin. In four years she has built Python tools to clean and analyse groundwater monitoring data, forecast reservoir levels and map drought exposure with remote sensing and GIS. She has worked with the Department of Water and Sanitation and a regional river basin commission, and enjoys making dashboards that operators actually use. Onalenna is completing an MSc in hydroinformatics and is keen to apply data science to irrigation and urban water planning.$$,
  $$[{"name":"Water Management","tier":"primary","level":"item"},{"name":"Climate Adaptation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Data Science","tier":"primary","level":"item"},{"name":"Python/R","tier":"primary","level":"item"},{"name":"GIS Mapping","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Tswana$$]::text[],
  $$[{"organization":"Department of Water and Sanitation, Botswana","role":"Data Analyst","start_year":2022,"end_year":null,"logo_url":null,"description":"Groundwater and reservoir data analysis."},{"organization":"Limpopo Watercourse Commission","role":"Intern","start_year":2021,"end_year":2022,"logo_url":null,"description":"Supported basin data harmonization."}]$$::jsonb,
  $$[{"institution":"University of Botswana","degree_or_course":"BSc Environmental Science","start_year":2016,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Arjun Raghavan (demo-arjun-raghavan)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '15212843-500f-540b-b3a1-32e16a2b00b6',
  NULL,
  $$Individual$$,
  $$demo-arjun-raghavan$$,
  $$Arjun Raghavan$$,
  $$Urban Transport PPP Advisor | Metro & Bus Concessions, Financial Modeling | India & South Asia$$,
  $$New Delhi, India$$,
  $$senior$$,
  NULL,
  $$Indian citizen; contracts as an individual or through Raghavan Infrastructure Advisors LLP.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', (current_date + 300)::text),
  now() - interval '70 days',
  $$https://i.pravatar.cc/150?u=demo-arjun-raghavan$$,
  $$https://picsum.photos/seed/demo-arjun-raghavan/800/200$$,
  $$Arjun Raghavan has advised on urban transport and public-private partnerships in India and South Asia for twenty years. He has structured bus concession and metro feeder contracts for state transport undertakings, built financial models for gross-cost and net-cost bus contracts, and prepared electric bus procurement under national incentive schemes. His work also covers energy efficiency in depots and street lighting PPPs. Arjun previously worked in the infrastructure advisory practice of a large accounting firm and has supported the Asian Development Bank and the World Bank on city transport projects in India, Sri Lanka and Bangladesh.$$,
  $$[{"name":"Public-Private Partnerships","tier":"primary","level":"item"},{"name":"Urban Transport","tier":"primary","level":"item"},{"name":"Energy Efficiency","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Hindi$$, $$Tamil$$]::text[],
  $$[{"organization":"Independent consultant","role":"Urban Transport PPP Advisor","start_year":2017,"end_year":null,"logo_url":null,"description":"Transaction advice for cities and development banks."},{"organization":"Big Four infrastructure advisory practice (India)","role":"Director, Transport","start_year":2008,"end_year":2017,"logo_url":null,"description":"Led PPP transaction advisory for state transport undertakings."},{"organization":"Asian Development Bank","role":"Transport Consultant","start_year":2005,"end_year":2008,"logo_url":"https://cdn.brandfetch.io/adb.org","description":"Supported urban transport project preparation in India."}]$$::jsonb,
  $$[{"institution":"Indian Institute of Technology Madras","degree_or_course":"MTech Transportation Engineering","start_year":2002,"end_year":2004,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Kavya Subramanian (demo-kavya-subramanian)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'acdfbc21-791f-52cf-8954-50c0214e229e',
  NULL,
  $$Individual$$,
  $$demo-kavya-subramanian$$,
  $$Kavya Subramanian$$,
  $$Data & Cloud Architect for Public Digital Infrastructure | Social Protection Systems | India$$,
  $$Bengaluru, India$$,
  $$mid_career$$,
  NULL,
  $$Indian citizen; contracts as an individual consultant. Remote only.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '8 days',
  $$https://i.pravatar.cc/150?u=demo-kavya-subramanian$$,
  $$https://picsum.photos/seed/demo-kavya-subramanian/800/200$$,
  $$Kavya Subramanian is a data and cloud architect who builds digital public infrastructure for government programmes. Over ten years she has designed data platforms for social protection registries, beneficiary payment reconciliation and grievance systems in Indian states, and advised two African governments on cloud architecture and cybersecurity for social registries. She is strong in database management at scale, data pipelines and privacy-by-design, and she translates technical choices into plain options for policymakers. Kavya previously worked at a large Indian technology services company and on a national digital identity integration team.$$,
  $$[{"name":"Digital Governance","tier":"secondary","level":"item"},{"name":"Social Protection","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Data Science","tier":"primary","level":"item"},{"name":"Cloud Architecture","tier":"primary","level":"item"},{"name":"Database Management","tier":"secondary","level":"item"},{"name":"Cybersecurity","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"AWS Certified Solutions Architect – Professional","issuing_organization":"Amazon Web Services","year":2021,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Tamil$$, $$Kannada$$, $$Hindi$$]::text[],
  $$[{"organization":"Independent consultant","role":"Data and Cloud Architect","start_year":2021,"end_year":null,"logo_url":null,"description":"Digital public infrastructure for governments and development partners."},{"organization":"Indian IT services company","role":"Senior Data Engineer","start_year":2015,"end_year":2021,"logo_url":null,"description":"Built government data platforms for state social welfare departments."}]$$::jsonb,
  $$[{"institution":"National Institute of Technology Tiruchirappalli","degree_or_course":"BTech Computer Science","start_year":2011,"end_year":2015,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Mehwish Tariq Khan (demo-mehwish-tariq-khan)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '6d682be3-84e0-5676-b195-2b603655c7e8',
  NULL,
  $$Individual$$,
  $$demo-mehwish-tariq-khan$$,
  $$Mehwish Tariq Khan$$,
  $$Gender Budgeting Analyst | Public Expenditure & Statistical Analysis | Pakistan$$,
  $$Lahore, Pakistan$$,
  $$early_career$$,
  NULL,
  $$Pakistani citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 45)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '220 days',
  $$https://i.pravatar.cc/150?u=demo-mehwish-tariq-khan$$,
  $$https://picsum.photos/seed/demo-mehwish-tariq-khan/800/200$$,
  $$Mehwish Tariq Khan is a gender budgeting analyst with four years of experience in Pakistan. She has tagged provincial development budgets for gender relevance, analysed public expenditure on girls' schooling and maternal health, and written policy briefs for provincial finance departments and women's caucuses. Her statistical analysis draws on labour force and household income surveys, and she produces clear charts for non-technical readers. Mehwish worked at a Lahore policy institute before going independent and is building expertise in gender mainstreaming in public financial management.$$,
  $$[{"name":"Gender Budgeting","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Statistical Analysis","tier":"primary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Urdu$$, $$English$$, $$Punjabi$$]::text[],
  $$[{"organization":"Lahore policy institute","role":"Research Associate","start_year":2021,"end_year":2024,"logo_url":null,"description":"Public expenditure and gender research."},{"organization":"Punjab Commission on the Status of Women","role":"Intern","start_year":2020,"end_year":2021,"logo_url":null,"description":"Supported the gender parity report."}]$$::jsonb,
  $$[{"institution":"Lahore School of Economics","degree_or_course":"MPhil Economics","start_year":2018,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Sushila Gurung Thapa (demo-sushila-gurung-thapa)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '2cc721e1-3404-5ce7-8b4f-51160ace6bd9',
  NULL,
  $$Individual$$,
  $$demo-sushila-gurung-thapa$$,
  $$Sushila Gurung Thapa$$,
  $$Disability Inclusion Trainer | Inclusive Education & Facilitation | Nepal$$,
  $$Kathmandu, Nepal$$,
  $$mid_career$$,
  NULL,
  $$Nepali citizen; contracts as an individual consultant.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '12 days',
  $$https://i.pravatar.cc/150?u=demo-sushila-gurung-thapa$$,
  $$https://picsum.photos/seed/demo-sushila-gurung-thapa/800/200$$,
  $$Sushila Gurung Thapa is a disability inclusion specialist and trainer with eleven years of experience in Nepal. She has trained teachers, local government officials and NGO staff on inclusive education and disability-inclusive programming, and designed training of trainers packages used by organizations of persons with disabilities. She facilitates participatory workshops that bring disabled people's organizations and service providers together, and mentors young disability rights activists. Sushila previously coordinated inclusive primary education pilots in Province 1 and has advised on accessibility standards for school reconstruction after the 2015 earthquake.$$,
  $$[{"name":"Disability Inclusion","tier":"primary","level":"item"},{"name":"Primary Education","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Training of Trainers","tier":"primary","level":"item"},{"name":"Workshop Facilitation","tier":"primary","level":"item"},{"name":"Mentoring","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Nepali$$, $$English$$, $$Hindi$$]::text[],
  $$[{"organization":"Independent consultant","role":"Disability Inclusion Trainer","start_year":2019,"end_year":null,"logo_url":null,"description":"Training and facilitation for NGOs and local governments."},{"organization":"Humanity & Inclusion Nepal","role":"Inclusive Education Coordinator","start_year":2014,"end_year":2019,"logo_url":null,"description":"Coordinated inclusive education pilots in eastern Nepal."}]$$::jsonb,
  $$[{"institution":"Tribhuvan University","degree_or_course":"MA Sociology","start_year":2010,"end_year":2012,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Rajan Shrestha (demo-rajan-shrestha)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'c6ad355c-52d5-5e44-b063-ad6575f1b8ff',
  NULL,
  $$Individual$$,
  $$demo-rajan-shrestha$$,
  $$Rajan Shrestha$$,
  $$Documentary Photographer & Filmmaker | Rural Livelihoods & Climate Stories | Nepal & Himalaya$$,
  $$Pokhara, Nepal$$,
  $$mid_career$$,
  NULL,
  $$Nepali citizen; invoices as a sole proprietor.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 100)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '340 days',
  $$https://i.pravatar.cc/150?u=demo-rajan-shrestha$$,
  $$https://picsum.photos/seed/demo-rajan-shrestha/800/200$$,
  $$Rajan Shrestha is a documentary photographer and filmmaker who has worked with development organizations in Nepal and the Himalaya for twelve years. He photographs and films rural livelihoods, glacier and climate change impacts, and community-led projects, producing photo essays, short documentaries and motion graphics for reports and social media. He handles subtitling in Nepali and English and works sensitively with communities on consent and representation. His work has appeared in UN and NGO annual reports and in international exhibitions on mountain communities.$$,
  $$[{"name":"Rural Development","tier":"secondary","level":"item"},{"name":"Climate & Environment","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Photography","tier":"primary","level":"item"},{"name":"Motion Graphics","tier":"primary","level":"item"},{"name":"Social Media","tier":"secondary","level":"item"},{"name":"Subtitling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Nepali$$, $$English$$]::text[],
  $$[{"organization":"Freelance","role":"Photographer and Filmmaker","start_year":2016,"end_year":null,"logo_url":null,"description":"Visual storytelling for development organizations."},{"organization":"ICIMOD","role":"Communications Officer (Visual)","start_year":2013,"end_year":2016,"logo_url":null,"description":"Produced photo and video content on mountain livelihoods."}]$$::jsonb,
  $$[{"institution":"Kathmandu University","degree_or_course":"BA Media Studies","start_year":2008,"end_year":2012,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Farid Ahmad Noori (demo-farid-ahmad-noori)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'eb73efe8-dd02-5d87-837a-fa818d06fdfc',
  NULL,
  $$Individual$$,
  $$demo-farid-ahmad-noori$$,
  $$Farid Ahmad Noori$$,
  $$Third-Party Monitoring Specialist | Humanitarian M&E in Insecure Areas | Afghanistan$$,
  $$Kabul, Afghanistan$$,
  $$senior$$,
  NULL,
  $$Afghan citizen; contracts as an individual. International travel subject to visa availability.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 30)::text),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 30)::text),
  now() - interval '250 days',
  $$https://i.pravatar.cc/150?u=demo-farid-ahmad-noori$$,
  $$https://picsum.photos/seed/demo-farid-ahmad-noori/800/200$$,
  $$Farid Ahmad Noori has led third-party monitoring of humanitarian and rural development programmes in Afghanistan for sixteen years. He designs monitoring and evaluation frameworks for food assistance, cash and rural infrastructure projects, sets up remote verification with geotagged photos and phone surveys, and manages networks of male and female monitors across difficult provinces. His survey design work adapts sampling and questionnaires to access constraints and cultural norms, and he trains local staff in data quality. Farid has worked with UN agencies, the World Bank's monitoring agents and international NGOs.$$,
  $$[{"name":"Humanitarian Aid","tier":"primary","level":"item"},{"name":"Rural Development","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Monitoring & Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Dari$$, $$Pashto$$, $$English$$]::text[],
  $$[{"organization":"Third-party monitoring firm (Kabul)","role":"Monitoring Director","start_year":2016,"end_year":2024,"logo_url":null,"description":"Led third-party monitoring for UN and World Bank-financed programmes."},{"organization":"Ministry of Rural Rehabilitation and Development","role":"M&E Officer","start_year":2009,"end_year":2016,"logo_url":null,"description":"Monitored rural infrastructure projects."}]$$::jsonb,
  $$[{"institution":"Kabul University","degree_or_course":"BSc Economics","start_year":2003,"end_year":2007,"logo_url":null},{"institution":"Asian Institute of Technology","degree_or_course":"MSc Development Planning","start_year":2007,"end_year":2009,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Indus Development Advisory (demo-indus-development-advisory)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '857cb619-5ff5-59a4-a0dc-47bec20f3369',
  NULL,
  $$Large Firm$$,
  $$demo-indus-development-advisory$$,
  $$Indus Development Advisory$$,
  $$Development Research & Evaluation Firm | Health, Social Protection & Education | South Asia & Africa$$,
  $$New Delhi, India$$,
  NULL,
  1998,
  $$Registered in India (Pvt. Ltd.) with an affiliate in Dhaka; contracts as a firm and is pre-qualified with several UN agencies.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '14 days',
  $$https://i.pravatar.cc/150?u=demo-indus-development-advisory$$,
  $$https://picsum.photos/seed/demo-indus-development-advisory/800/200$$,
  $$Indus Development Advisory is a New Delhi research and evaluation firm of 220 staff founded in 1998. It conducts large household surveys, impact evaluations and process evaluations for governments, foundations and UN agencies in South Asia and, increasingly, in East Africa. Its main sectors are health systems, nutrition, social protection, primary education and WASH. The firm has in-house survey operations with 400 field staff, a data science unit and statisticians who handle complex sampling and analysis, and a project management office that runs multi-state studies. Indus has completed more than 600 studies, including evaluations of national health insurance, cash transfers and school feeding.$$,
  $$[{"name":"Health Systems","tier":"primary","level":"item"},{"name":"Social Protection","tier":"primary","level":"item"},{"name":"Primary Education","tier":"secondary","level":"item"},{"name":"Nutrition","tier":"secondary","level":"item"},{"name":"WASH","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"TÜV SÜD","year":2016,"credential_id_or_url":null},{"name":"ISO 20252 Market, opinion and social research","issuing_organization":"TÜV SÜD","year":2019,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Hindi$$, $$Bengali$$, $$Tamil$$, $$Urdu$$]::text[],
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

-- Padma WASH Associates (demo-padma-wash-associates)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '60012da1-cfcb-5751-9c9d-562befeda581',
  NULL,
  $$Small Firm$$,
  $$demo-padma-wash-associates$$,
  $$Padma WASH Associates$$,
  $$WASH & Water Management Consultancy | Climate-Resilient Water Supply | Bangladesh$$,
  $$Dhaka, Bangladesh$$,
  NULL,
  2013,
  $$Registered in Bangladesh (private limited company); contracts as a firm.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date + 180)::text),
  now() - interval '100 days',
  $$https://i.pravatar.cc/150?u=demo-padma-wash-associates$$,
  $$https://picsum.photos/seed/demo-padma-wash-associates/800/200$$,
  $$Padma WASH Associates is a Dhaka consultancy of eight engineers and social scientists working on WASH and water management in Bangladesh since 2013. It designs climate-resilient water supply for coastal and char areas, including rainwater harvesting, pond sand filters and managed aquifer recharge, and supports utilities and local governments with project management and supervision. The team maps water points and salinity with GIS and runs household surveys on water access and sanitation. Clients include UNICEF, the Department of Public Health Engineering and international NGOs.$$,
  $$[{"name":"WASH","tier":"primary","level":"item"},{"name":"Water Management","tier":"primary","level":"item"},{"name":"Climate Adaptation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"GIS Mapping","tier":"secondary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Bengali$$, $$English$$]::text[],
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

-- Ananya Bhattacharya (demo-ananya-bhattacharya)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '72fc8f18-214f-5760-8535-db3d504e2c06',
  NULL,
  $$Individual$$,
  $$demo-ananya-bhattacharya$$,
  $$Ananya Bhattacharya$$,
  $$Research Editor & Writer | Academic Editing, Ghostwriting & Policy Briefs | India$$,
  $$Kolkata, India$$,
  $$early_career$$,
  NULL,
  $$Indian citizen; invoices as an individual (GST registered).$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '3 days',
  $$https://i.pravatar.cc/150?u=demo-ananya-bhattacharya$$,
  $$https://picsum.photos/seed/demo-ananya-bhattacharya/800/200$$,
  $$Ananya Bhattacharya is a research editor and writer who works with think tanks, universities and NGOs on human development topics. In five years she has edited working papers and journal submissions on education, health and social policy, ghostwritten op-eds and book chapters for senior researchers, and drafted policy briefs from long technical reports. She is careful with evidence, fast with turnaround, and comfortable with house styles from academic journals to UN publications. Ananya previously worked as an assistant editor at an economics and policy journal.$$,
  $$[{"name":"Human Development","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Academic Editing","tier":"primary","level":"item"},{"name":"Technical Writing","tier":"primary","level":"item"},{"name":"Ghostwriting","tier":"secondary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Bengali$$, $$Hindi$$]::text[],
  $$[{"organization":"Freelance","role":"Research Editor and Writer","start_year":2023,"end_year":null,"logo_url":null,"description":"Editing and writing for think tanks and universities."},{"organization":"Economics and policy journal (Kolkata)","role":"Assistant Editor","start_year":2020,"end_year":2023,"logo_url":null,"description":"Copy-edited and managed peer review for research articles."}]$$::jsonb,
  $$[{"institution":"Jadavpur University","degree_or_course":"MA English Literature","start_year":2017,"end_year":2019,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Portfolio items for this part: replace wholesale.
DELETE FROM portfolio_items WHERE profile_id IN (SELECT id FROM profiles WHERE handle IN ($$demo-kwabena-owusu-ansah$$, $$demo-fatmata-kamara$$, $$demo-aisha-bello-danjuma$$, $$demo-chidi-okonkwo-nwosu$$, $$demo-mariam-traore$$, $$demo-grace-wanjiru-kamau$$, $$demo-aline-uwimana$$, $$demo-achieng-otieno$$, $$demo-celso-mabunda$$, $$demo-grace-mbuyi-tshimanga$$, $$demo-herve-nkeng-tabi$$, $$demo-achta-mahamat-saleh$$, $$demo-edvania-kiala$$, $$demo-kopano-communications$$, $$demo-lerato-mokoena$$, $$demo-onalenna-kgosietsile$$, $$demo-arjun-raghavan$$, $$demo-kavya-subramanian$$, $$demo-mehwish-tariq-khan$$, $$demo-sushila-gurung-thapa$$, $$demo-rajan-shrestha$$, $$demo-farid-ahmad-noori$$, $$demo-indus-development-advisory$$, $$demo-padma-wash-associates$$, $$demo-ananya-bhattacharya$$));

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-kwabena-owusu-ansah$$), $$Mini-Grid Tariff Study, Volta and Northern Regions$$, $$Energy Commission of Ghana$$, 2019, 2020, $$Lead Analyst$$, $$Modelled cost-reflective tariffs for 55 solar mini-grids on island and lakeside communities and proposed a cross-subsidy mechanism.$$, $$Tariff framework adopted by the regulator; three private developers entered the market.$$, $$https://picsum.photos/seed/demo-kwabena-owusu-ansah-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kwabena-owusu-ansah-portfolio-1-img1/900/600","caption":"Island mini-grid on Lake Volta"},{"url":"https://picsum.photos/seed/demo-kwabena-owusu-ansah-portfolio-1-img2/900/600","caption":"Tariff consultation in Tamale"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-kwabena-owusu-ansah$$), $$Results-Based Financing for Efficient Cooling, Nigeria$$, $$Clean Energy Fund (multi-donor)$$, 2022, 2023, $$Financial Modeling Lead$$, $$Designed incentive levels and financial models for a results-based financing window supporting energy-efficient cold storage for traders.$$, $$Window launched with 14 participating companies and 2,100 cold rooms planned.$$, $$https://picsum.photos/seed/demo-kwabena-owusu-ansah-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kwabena-owusu-ansah-portfolio-2-img1/900/600","caption":"Solar cold room in a Lagos market"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-fatmata-kamara$$), $$Farmer Field School Outcome Survey, Bombali$$, $$FAO Sierra Leone$$, 2023, 2023, $$Survey Coordinator$$, $$Designed and coordinated a tablet-based survey of 600 farmer field school members on adoption of improved rice practices.$$, $$Survey showed 40% adoption of line planting and informed the next season's training plan.$$, $$https://picsum.photos/seed/demo-fatmata-kamara-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-fatmata-kamara-portfolio-1-img1/900/600","caption":"Farmer field school session in Bombali"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-fatmata-kamara$$), $$Upland Land-Use Mapping Study$$, $$Sierra Leone Agricultural Research Institute$$, 2022, 2023, $$GIS Assistant$$, $$Mapped 900 upland plots with GPS and QGIS to measure fallow periods and slash-and-burn clearing.$$, $$Maps used to target agroecology demonstration sites.$$, $$https://picsum.photos/seed/demo-fatmata-kamara-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-fatmata-kamara-portfolio-2-img1/900/600","caption":"Plot boundary mapping with a farmer"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-aisha-bello-danjuma$$), $$Early Grade Reading Curriculum in Hausa, Kano and Katsina$$, $$FCDO$$, 2018, 2021, $$Curriculum Lead$$, $$Designed scripted lessons and teacher guides for early grade reading in Hausa and led the training of trainers cascade for 4,800 teachers.$$, $$Oral reading fluency in pilot schools doubled over two years; the curriculum was adopted statewide.$$, $$https://picsum.photos/seed/demo-aisha-bello-danjuma-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-aisha-bello-danjuma-portfolio-1-img1/900/600","caption":"Teacher training session in Kano"},{"url":"https://picsum.photos/seed/demo-aisha-bello-danjuma-portfolio-1-img2/900/600","caption":"Hausa reading lesson in Primary 2"},{"url":"https://picsum.photos/seed/demo-aisha-bello-danjuma-portfolio-1-img3/900/600","caption":"Lesson observation with a coach"}]$$::jsonb, $$[{"label":"Programme summary","url":"https://example.org/hausa-early-grade-reading"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-aisha-bello-danjuma$$), $$Radio and E-Learning Lessons During School Closures$$, $$UNICEF Nigeria$$, 2020, 2021, $$Content Lead$$, $$Led production of radio lessons and e-learning modules for primary learners in Hausa and English, with guidance for caregivers.$$, $$Lessons broadcast on four state radio stations and reached an estimated 900,000 children.$$, $$https://picsum.photos/seed/demo-aisha-bello-danjuma-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-aisha-bello-danjuma-portfolio-2-img1/900/600","caption":"Radio lesson recording"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-chidi-okonkwo-nwosu$$), $$Innovation Hub Strategy, Enugu State$$, $$GIZ Nigeria$$, 2021, 2022, $$Lead Consultant$$, $$Mapped the state's start-up ecosystem and designed the operating model for a public-private innovation hub.$$, $$Hub opened in 2023 and supported 60 start-ups in its first year.$$, $$https://picsum.photos/seed/demo-chidi-okonkwo-nwosu-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-chidi-okonkwo-nwosu-portfolio-1-img1/900/600","caption":"Ecosystem mapping workshop in Enugu"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-chidi-okonkwo-nwosu$$), $$Youth Entrepreneur Finance Market Study$$, $$Mastercard Foundation$$, 2020, 2020, $$Market Research Lead$$, $$Surveyed 1,000 young entrepreneurs and 20 lenders on demand for and supply of SME finance in Lagos, Kano and Port Harcourt.$$, $$Study informed a youth SME lending guarantee programme.$$, $$https://picsum.photos/seed/demo-chidi-okonkwo-nwosu-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-chidi-okonkwo-nwosu-portfolio-2-img1/900/600","caption":"Interview with a young entrepreneur in Yaba"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-mariam-traore$$), $$Resilience Programme M&E System, Mopti and Ségou$$, $$European Union$$, 2019, 2022, $$M&E Lead$$, $$Designed the results framework, household resilience survey and remote monitoring system for a multi-partner resilience programme in conflict-affected areas.$$, $$System tracked 45,000 households; data led to earlier lean-season cash transfers in 2021.$$, $$https://picsum.photos/seed/demo-mariam-traore-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mariam-traore-portfolio-1-img1/900/600","caption":"Enumerator training in Ségou"},{"url":"https://picsum.photos/seed/demo-mariam-traore-portfolio-1-img2/900/600","caption":"Monitoring visit to a women's market garden"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-mariam-traore$$), $$Evaluation of Seasonal Cash Transfers, Northern Burkina Faso$$, $$World Food Programme$$, 2022, 2023, $$Evaluation Team Leader$$, $$Mixed-methods evaluation of lean-season cash transfers to displaced and host households, with a 1,500-household survey and statistical analysis of food consumption scores.$$, $$Evaluation recommended transfer-value indexing to market prices, adopted for the 2024 lean season.$$, $$https://picsum.photos/seed/demo-mariam-traore-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mariam-traore-portfolio-2-img1/900/600","caption":"Distribution site in Kaya"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-grace-wanjiru-kamau$$), $$County Climate Change Action Plans, Isiolo and Marsabit$$, $$Kenya Financing Locally-Led Climate Action Program$$, 2022, 2023, $$Lead Writer$$, $$Drafted county climate action plans with ward-level consultations on drought, water management and livestock.$$, $$Plans adopted by both county assemblies and used to allocate climate resilience grants.$$, $$https://picsum.photos/seed/demo-grace-wanjiru-kamau-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-grace-wanjiru-kamau-portfolio-1-img1/900/600","caption":"Ward consultation in Isiolo"},{"url":"https://picsum.photos/seed/demo-grace-wanjiru-kamau-portfolio-1-img2/900/600","caption":"Water pan visited during consultations"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-grace-wanjiru-kamau$$), $$Drought Resilience Policy Brief Series$$, $$IGAD$$, 2019, 2020, $$Author$$, $$Wrote a series of six policy briefs on groundwater, early warning and WASH services in drylands for regional ministers.$$, $$Briefs were used in the regional drought resilience platform's ministerial meeting.$$, $$https://picsum.photos/seed/demo-grace-wanjiru-kamau-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-grace-wanjiru-kamau-portfolio-2-img1/900/600","caption":"Policy brief launch"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-aline-uwimana$$), $$Blended Courses for TVET Instructors$$, $$Rwanda TVET Board$$, 2023, 2024, $$Learning Designer$$, $$Designed four blended courses for TVET instructors on teaching methods and digital tools, with e-learning modules on Moodle.$$, $$650 instructors completed the courses; completion rate 82%.$$, $$https://picsum.photos/seed/demo-aline-uwimana-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-aline-uwimana-portfolio-1-img1/900/600","caption":"Instructor workshop in Musanze"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-aline-uwimana$$), $$Online Entrepreneurship Module for University Students$$, $$University of Rwanda$$, 2021, 2022, $$Course Designer$$, $$Built an online entrepreneurship module with case studies from Kigali start-ups and a simple web tool for team project submissions.$$, $$Module now compulsory for second-year business students.$$, $$https://picsum.photos/seed/demo-aline-uwimana-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-aline-uwimana-portfolio-2-img1/900/600","caption":"Student pitch session"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-achieng-otieno$$), $$Climate and Health Infographic Series$$, $$Africa Population and Health Research Center$$, 2021, 2022, $$Designer$$, $$Designed a series of 20 infographics and a report layout on heat, air quality and child health in Nairobi informal settlements.$$, $$Series shared widely on social media and used in county health briefings.$$, $$https://picsum.photos/seed/demo-achieng-otieno-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-achieng-otieno-portfolio-1-img1/900/600","caption":"Infographic on heat exposure"},{"url":"https://picsum.photos/seed/demo-achieng-otieno-portfolio-1-img2/900/600","caption":"Report spread"}]$$::jsonb, $$[{"label":"Portfolio sample","url":"https://example.org/achieng-climate-health"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-achieng-otieno$$), $$Community Health Campaign Identity$$, $$Amref Health Africa$$, 2023, 2023, $$Brand Designer$$, $$Created the visual identity, posters and short motion graphics for a community health volunteer recruitment campaign.$$, $$Campaign materials used in 12 counties.$$, $$https://picsum.photos/seed/demo-achieng-otieno-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-achieng-otieno-portfolio-2-img1/900/600","caption":"Campaign poster in a health centre"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-celso-mabunda$$), $$Cabo Delgado Recovery Consultations$$, $$UNDP Mozambique$$, 2022, 2023, $$Lead Interpreter$$, $$Interpreted community consultations and coordination meetings on recovery and reconstruction for displaced and host communities in Cabo Delgado.$$, $$More than 60 consultations interpreted; consultation summaries translated for donors within 48 hours.$$, $$https://picsum.photos/seed/demo-celso-mabunda-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-celso-mabunda-portfolio-1-img1/900/600","caption":"Community consultation in Pemba"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-celso-mabunda$$), $$Cyclone Idai Response Translation and Localization$$, $$International Federation of Red Cross and Red Crescent Societies$$, 2019, 2019, $$Translation Coordinator$$, $$Coordinated translation and localization of health and shelter messages into Portuguese and local languages during the Cyclone Idai response.$$, $$Messages reached affected communities in Sofala within the first two weeks.$$, $$https://picsum.photos/seed/demo-celso-mabunda-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-celso-mabunda-portfolio-2-img1/900/600","caption":"Translated shelter messages in Beira"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-grace-mbuyi-tshimanga$$), $$Survivors' Access to Justice Study, North and South Kivu$$, $$UN Women$$, 2021, 2022, $$Research Lead$$, $$Led survivor-centred qualitative research with 180 survivors, judges and community leaders on barriers to justice and reparations.$$, $$Findings underpinned a national advocacy campaign and a reparations fund pilot.$$, $$https://picsum.photos/seed/demo-grace-mbuyi-tshimanga-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-grace-mbuyi-tshimanga-portfolio-1-img1/900/600","caption":"Research team training in Goma"},{"url":"https://picsum.photos/seed/demo-grace-mbuyi-tshimanga-portfolio-1-img2/900/600","caption":"Community dialogue in Kalehe"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-grace-mbuyi-tshimanga$$), $$Evaluation of Community Dialogue Programme, Ituri$$, $$European Union$$, 2019, 2019, $$Evaluation Team Leader$$, $$Evaluated a peacebuilding programme using community dialogue and women's mediation networks.$$, $$Evaluation led to expansion of women's mediation networks to two additional territories.$$, $$https://picsum.photos/seed/demo-grace-mbuyi-tshimanga-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-grace-mbuyi-tshimanga-portfolio-2-img1/900/600","caption":"Women's mediation network meeting"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-herve-nkeng-tabi$$), $$Participatory Mapping with Baka Communities, East Region$$, $$Rainforest Foundation UK$$, 2016, 2018, $$Mapping Coordinator$$, $$Coordinated participatory mapping of customary land use with Baka communities around two national parks.$$, $$Maps of 40 villages submitted to the forestry ministry for recognition of use rights.$$, $$https://picsum.photos/seed/demo-herve-nkeng-tabi-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-herve-nkeng-tabi-portfolio-1-img1/900/600","caption":"Community mapping session"},{"url":"https://picsum.photos/seed/demo-herve-nkeng-tabi-portfolio-1-img2/900/600","caption":"GPS training with Baka mappers"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-herve-nkeng-tabi$$), $$Deforestation Risk Mapping for Cocoa Supply Chains$$, $$WWF Cameroon$$, 2021, 2022, $$GIS Analyst$$, $$Mapped deforestation risk around cocoa-growing areas to guide sustainable farming support and buyer due diligence.$$, $$Risk maps used by two cocoa exporters for supplier monitoring.$$, $$https://picsum.photos/seed/demo-herve-nkeng-tabi-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-herve-nkeng-tabi-portfolio-2-img1/900/600","caption":"Forest cover change map"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-achta-mahamat-saleh$$), $$Multi-Sector Needs Assessment, Ouaddaï Refugee Camps$$, $$REACH Initiative$$, 2023, 2024, $$Field Supervisor$$, $$Supervised 30 enumerators conducting household surveys on food security, shelter and protection among newly arrived Sudanese refugees.$$, $$Assessment covered 4,200 households and guided the 2024 response plan.$$, $$https://picsum.photos/seed/demo-achta-mahamat-saleh-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-achta-mahamat-saleh-portfolio-1-img1/900/600","caption":"Enumerator briefing in Adré"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-achta-mahamat-saleh$$), $$Food Security Monitoring in Host Villages$$, $$World Food Programme$$, 2022, 2022, $$Enumerator Team Lead$$, $$Led data collection for quarterly food security monitoring in host villages near the camps.$$, $$Data informed inclusion of host households in food assistance.$$, $$https://picsum.photos/seed/demo-achta-mahamat-saleh-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-achta-mahamat-saleh-portfolio-2-img1/900/600","caption":"Interview in a host village"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-edvania-kiala$$), $$Value-for-Money Review of a Water PPP, Benguela$$, $$Ministério das Finanças de Angola$$, 2022, 2023, $$Financial Analyst$$, $$Built the public sector comparator and PPP financial model for a bulk water supply project.$$, $$Review led the ministry to restructure the payment mechanism before tender.$$, $$https://picsum.photos/seed/demo-edvania-kiala-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-edvania-kiala-portfolio-1-img1/900/600","caption":"Site visit to the water treatment plant"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-edvania-kiala$$), $$Trade Facilitation Diagnostic, Port of Lobito Corridor$$, $$World Bank$$, 2024, 2024, $$Research Analyst$$, $$Supported a diagnostic of border and port procedures along the Lobito corridor, including interviews with traders and logistics firms.$$, $$Diagnostic identified six procedural reforms now in the government's trade facilitation plan.$$, $$https://picsum.photos/seed/demo-edvania-kiala-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-edvania-kiala-portfolio-2-img1/900/600","caption":"Port of Lobito"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-kopano-communications$$), $$Basic Income Grant Advocacy Campaign$$, $$Civil-society coalition (foundation-funded)$$, 2021, 2023, $$Campaign Agency$$, $$Ran a national advocacy campaign for extending the social relief grant, combining media relations, social media and community storytelling in four languages.$$, $$Campaign generated more than 400 media stories and the grant was extended twice.$$, $$https://picsum.photos/seed/demo-kopano-communications-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kopano-communications-portfolio-1-img1/900/600","caption":"Community storytelling shoot in Soweto"},{"url":"https://picsum.photos/seed/demo-kopano-communications-portfolio-1-img2/900/600","caption":"Campaign billboard"},{"url":"https://picsum.photos/seed/demo-kopano-communications-portfolio-1-img3/900/600","caption":"Press briefing"}]$$::jsonb, $$[{"label":"Campaign case study","url":"https://example.org/kopano-basic-income"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-kopano-communications$$), $$Youth Employment Public Outreach Tour$$, $$UNDP South Africa$$, 2019, 2019, $$Outreach Agency$$, $$Organized a public outreach tour of township job fairs with speechwriting for ministers and social media coverage.$$, $$Tour reached 35,000 young people and registered 9,000 for job-matching services.$$, $$https://picsum.photos/seed/demo-kopano-communications-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kopano-communications-portfolio-2-img1/900/600","caption":"Job fair in Mamelodi"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-lerato-mokoena$$), $$Microsimulation of Grant Reform Options$$, $$National Treasury of South Africa$$, 2022, 2023, $$Lead Analyst$$, $$Modelled cost and poverty impacts of five options for reforming child and caregiver grants.$$, $$Results presented to the budget committee and used in the medium-term expenditure framework.$$, $$https://picsum.photos/seed/demo-lerato-mokoena-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lerato-mokoena-portfolio-1-img1/900/600","caption":"Microsimulation results briefing"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-lerato-mokoena$$), $$Disability Grant Assessment Review$$, $$UNICEF South Africa$$, 2019, 2020, $$Research Lead$$, $$Reviewed medical and functional assessment processes for disability grants, with statistical analysis of approval rates by province.$$, $$Recommendations informed a revised assessment protocol.$$, $$https://picsum.photos/seed/demo-lerato-mokoena-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-lerato-mokoena-portfolio-2-img1/900/600","caption":"Stakeholder workshop in Pretoria"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-onalenna-kgosietsile$$), $$Reservoir Level Forecasting Tool, Gaborone Dam$$, $$Department of Water and Sanitation, Botswana$$, 2023, 2024, $$Data Scientist$$, $$Built a Python forecasting model and dashboard for reservoir levels using rainfall, inflow and abstraction data.$$, $$Operators use the dashboard for weekly allocation decisions.$$, $$https://picsum.photos/seed/demo-onalenna-kgosietsile-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-onalenna-kgosietsile-portfolio-1-img1/900/600","caption":"Reservoir dashboard"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-onalenna-kgosietsile$$), $$Drought Exposure Mapping, Limpopo Basin$$, $$Limpopo Watercourse Commission$$, 2021, 2022, $$GIS Analyst$$, $$Mapped drought exposure of rural water points using remote sensing indices and GIS.$$, $$Maps used to prioritize borehole rehabilitation.$$, $$https://picsum.photos/seed/demo-onalenna-kgosietsile-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-onalenna-kgosietsile-portfolio-2-img1/900/600","caption":"Drought exposure map"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-arjun-raghavan$$), $$Electric Bus Gross-Cost Contracts, Three Indian Cities$$, $$State transport undertakings$$, 2021, 2023, $$Transaction Advisor$$, $$Structured gross-cost contracts for 1,200 electric buses, including financial modeling, risk allocation and bid process management.$$, $$Contracts awarded with per-kilometre costs 18% below benchmarks.$$, $$https://picsum.photos/seed/demo-arjun-raghavan-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-arjun-raghavan-portfolio-1-img1/900/600","caption":"Electric bus depot in Chennai"},{"url":"https://picsum.photos/seed/demo-arjun-raghavan-portfolio-1-img2/900/600","caption":"Bid conference"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-arjun-raghavan$$), $$Street Lighting Energy Efficiency PPP, Colombo$$, $$Asian Development Bank$$, 2018, 2019, $$PPP Specialist$$, $$Prepared an energy savings performance contract for LED street lighting.$$, $$Projected 55% energy savings; contract signed in 2020.$$, $$https://picsum.photos/seed/demo-arjun-raghavan-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-arjun-raghavan-portfolio-2-img1/900/600","caption":"LED street lighting pilot"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-kavya-subramanian$$), $$Social Registry Data Platform, Odisha$$, $$State Government of Odisha$$, 2019, 2021, $$Lead Data Engineer$$, $$Designed the data platform linking social protection schemes to a single registry, with payment reconciliation and deduplication.$$, $$Platform covers 9 million households; duplicate payments fell sharply.$$, $$https://picsum.photos/seed/demo-kavya-subramanian-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kavya-subramanian-portfolio-1-img1/900/600","caption":"Registry architecture review"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-kavya-subramanian$$), $$Cloud Hosting and Cybersecurity Review for a Social Registry$$, $$World Bank$$, 2023, 2024, $$Cloud Architect$$, $$Assessed hosting options and cybersecurity controls for an African government's social registry.$$, $$Government adopted a hybrid hosting model with a sovereign data centre.$$, $$https://picsum.photos/seed/demo-kavya-subramanian-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-kavya-subramanian-portfolio-2-img1/900/600","caption":"Remote architecture workshop"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-mehwish-tariq-khan$$), $$Gender Budget Tagging, Punjab Development Programme$$, $$UN Women Pakistan$$, 2022, 2023, $$Budget Analyst$$, $$Tagged 2,400 development projects for gender relevance and analysed allocations by sector.$$, $$Tagging method adopted in the provincial budget call circular.$$, $$https://picsum.photos/seed/demo-mehwish-tariq-khan-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mehwish-tariq-khan-portfolio-1-img1/900/600","caption":"Budget tagging workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-mehwish-tariq-khan$$), $$Public Spending on Girls' Secondary Schooling$$, $$Lahore policy institute$$, 2021, 2022, $$Research Associate$$, $$Analysed district spending on girls' secondary schools against enrolment data.$$, $$Policy brief cited in the provincial assembly's education committee.$$, $$https://picsum.photos/seed/demo-mehwish-tariq-khan-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mehwish-tariq-khan-portfolio-2-img1/900/600","caption":"District spending chart"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-sushila-gurung-thapa$$), $$Inclusive Education Training of Trainers, Koshi Province$$, $$Humanity & Inclusion$$, 2017, 2019, $$Coordinator$$, $$Designed and delivered a training of trainers programme on inclusive teaching for 120 resource teachers.$$, $$Resource teachers trained 1,900 classroom teachers; enrolment of children with disabilities rose in pilot schools.$$, $$https://picsum.photos/seed/demo-sushila-gurung-thapa-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sushila-gurung-thapa-portfolio-1-img1/900/600","caption":"Training session in Biratnagar"},{"url":"https://picsum.photos/seed/demo-sushila-gurung-thapa-portfolio-1-img2/900/600","caption":"Inclusive classroom"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-sushila-gurung-thapa$$), $$Disability-Inclusive Local Planning Workshops$$, $$UNDP Nepal$$, 2022, 2023, $$Lead Facilitator$$, $$Facilitated workshops between municipalities and organizations of persons with disabilities on inclusive local planning.$$, $$18 municipalities included accessibility budgets in annual plans.$$, $$https://picsum.photos/seed/demo-sushila-gurung-thapa-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sushila-gurung-thapa-portfolio-2-img1/900/600","caption":"Municipal planning workshop"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rajan-shrestha$$), $$Living with Melting Glaciers Photo Essay$$, $$ICIMOD$$, 2015, 2016, $$Photographer$$, $$Photo essay on herders and farmers adapting to glacier retreat in Mustang and Solukhumbu.$$, $$Exhibited in Kathmandu and at an international mountain conference.$$, $$https://picsum.photos/seed/demo-rajan-shrestha-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rajan-shrestha-portfolio-1-img1/900/600","caption":"Herder in upper Mustang"},{"url":"https://picsum.photos/seed/demo-rajan-shrestha-portfolio-1-img2/900/600","caption":"Glacial lake at dawn"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rajan-shrestha$$), $$Community Forestry Short Documentary$$, $$FAO Nepal$$, 2023, 2023, $$Director$$, $$Directed a 12-minute documentary with motion graphics on community forestry user groups, subtitled in English and Nepali.$$, $$Screened at a regional forestry week and viewed widely online.$$, $$https://picsum.photos/seed/demo-rajan-shrestha-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rajan-shrestha-portfolio-2-img1/900/600","caption":"Filming with a forest user group"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-farid-ahmad-noori$$), $$Third-Party Monitoring of Food and Cash Assistance$$, $$World Food Programme$$, 2021, 2024, $$Monitoring Director$$, $$Directed monitoring of food and cash distributions in 22 provinces, including phone surveys and geotagged site verification.$$, $$Monitoring covered 3,000 distributions a year; findings led to corrections at 14% of sites.$$, $$https://picsum.photos/seed/demo-farid-ahmad-noori-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-farid-ahmad-noori-portfolio-1-img1/900/600","caption":"Distribution site monitoring"},{"url":"https://picsum.photos/seed/demo-farid-ahmad-noori-portfolio-1-img2/900/600","caption":"Monitor training in Herat"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-farid-ahmad-noori$$), $$Rural Infrastructure Verification Survey$$, $$World Bank$$, 2018, 2020, $$Survey Lead$$, $$Designed the verification survey for community infrastructure sub-projects with women monitors for household interviews.$$, $$Verified 2,600 sub-projects; quality issues flagged were addressed in the next phase.$$, $$https://picsum.photos/seed/demo-farid-ahmad-noori-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-farid-ahmad-noori-portfolio-2-img1/900/600","caption":"Village water scheme inspection"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-indus-development-advisory$$), $$Impact Evaluation of a National Health Insurance Scheme$$, $$National Health Authority, India$$, 2020, 2023, $$Evaluation Firm$$, $$Quasi-experimental impact evaluation of hospitalization coverage on out-of-pocket spending across eight states, with a 24,000-household survey.$$, $$Found significant reductions in catastrophic health spending among poorer households; informed scheme expansion.$$, $$https://picsum.photos/seed/demo-indus-development-advisory-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-indus-development-advisory-portfolio-1-img1/900/600","caption":"Household survey in Uttar Pradesh"},{"url":"https://picsum.photos/seed/demo-indus-development-advisory-portfolio-1-img2/900/600","caption":"Hospital records review"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-indus-development-advisory$$), $$School Feeding and Nutrition Evaluation, Bangladesh$$, $$World Food Programme$$, 2018, 2019, $$Evaluation Firm$$, $$Evaluated the nutrition and education outcomes of school feeding in poverty-prone sub-districts.$$, $$Evaluation supported the government's national school meals policy.$$, $$https://picsum.photos/seed/demo-indus-development-advisory-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-indus-development-advisory-portfolio-2-img1/900/600","caption":"School meal in Satkhira"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-padma-wash-associates$$), $$Managed Aquifer Recharge Schemes, Khulna and Satkhira$$, $$UNICEF Bangladesh$$, 2019, 2022, $$Design and Supervision Firm$$, $$Designed and supervised 60 managed aquifer recharge schemes to supply safe water in saline coastal areas.$$, $$Schemes serve 48,000 people with year-round low-salinity water.$$, $$https://picsum.photos/seed/demo-padma-wash-associates-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-padma-wash-associates-portfolio-1-img1/900/600","caption":"Recharge scheme in Satkhira"},{"url":"https://picsum.photos/seed/demo-padma-wash-associates-portfolio-1-img2/900/600","caption":"Water quality testing"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-padma-wash-associates$$), $$Water Point Mapping, Char Areas of Kurigram$$, $$Department of Public Health Engineering$$, 2017, 2017, $$Survey Firm$$, $$Mapped 4,000 water points with GIS and surveyed household water access and sanitation.$$, $$Map used to prioritize flood-resilient tubewells.$$, $$https://picsum.photos/seed/demo-padma-wash-associates-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-padma-wash-associates-portfolio-2-img1/900/600","caption":"Raised tubewell on a char"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-ananya-bhattacharya$$), $$Working Paper Series on Learning Outcomes$$, $$Indian education research centre$$, 2023, 2024, $$Editor$$, $$Edited twelve working papers on foundational learning and teacher policy for publication.$$, $$Series published on schedule; two papers accepted in peer-reviewed journals.$$, $$https://picsum.photos/seed/demo-ananya-bhattacharya-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-ananya-bhattacharya-portfolio-1-img1/900/600","caption":"Working paper series covers"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-ananya-bhattacharya$$), $$Policy Briefs from a Health Financing Report$$, $$Health policy think tank$$, 2022, 2022, $$Writer$$, $$Drafted four policy briefs from a 200-page report on state health financing.$$, $$Briefs used in state budget consultations.$$, $$https://picsum.photos/seed/demo-ananya-bhattacharya-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-ananya-bhattacharya-portfolio-2-img1/900/600","caption":"Policy brief layout"}]$$::jsonb, $$[]$$::jsonb, 2);

COMMIT;
