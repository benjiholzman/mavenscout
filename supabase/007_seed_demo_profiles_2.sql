-- 007 (part 2 of 4): synthetic demo profiles — GENERATED, do not edit by hand.
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

-- Sana Rizvi Hussain (demo-sana-rizvi-hussain)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '98c99227-1ba2-5411-8f38-abb1dab14aad',
  NULL,
  $$Individual$$,
  $$demo-sana-rizvi-hussain$$,
  $$Sana Rizvi Hussain$$,
  $$Financial Inclusion & SME Finance Specialist | Women's Enterprise, Market Research | Pakistan$$,
  $$Karachi, Pakistan$$,
  $$senior$$,
  NULL,
  $$Pakistani citizen; contracts as an individual consultant.$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 45)::text, 'until', NULL),
  now() - interval '19 days',
  $$https://i.pravatar.cc/150?u=demo-sana-rizvi-hussain$$,
  $$https://picsum.photos/seed/demo-sana-rizvi-hussain/800/200$$,
  $$Sana Rizvi Hussain is a financial inclusion specialist with eighteen years of experience in SME finance and women's enterprise in Pakistan. She has led market research on demand for credit among women-owned businesses, designed SME lending products with commercial and microfinance banks, and advised the central bank on gender targets in its financial inclusion strategy. Her work includes financial modeling of credit guarantee schemes and survey design for national SME surveys. Sana previously headed SME product development at a commercial bank and is a frequent speaker on gender mainstreaming in financial services.$$,
  $$[{"name":"Financial Inclusion","tier":"primary","level":"item"},{"name":"SME Support","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Market Research","tier":"primary","level":"item"},{"name":"Financial Modeling","tier":"secondary","level":"item"},{"name":"Survey Design","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Urdu$$, $$English$$, $$Sindhi$$]::text[],
  $$[{"organization":"Independent consultant","role":"Financial Inclusion Specialist","start_year":2018,"end_year":null,"logo_url":null,"description":"SME finance and gender work for banks and development partners."},{"organization":"Commercial bank (Karachi)","role":"Head of SME Product Development","start_year":2010,"end_year":2018,"logo_url":null,"description":"Designed SME lending products."},{"organization":"Pakistan Microfinance Network","role":"Research Officer","start_year":2007,"end_year":2010,"logo_url":null,"description":"Industry research and benchmarking."}]$$::jsonb,
  $$[{"institution":"Institute of Business Administration, Karachi","degree_or_course":"MBA Finance","start_year":2005,"end_year":2007,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Sreymom Keo (demo-sreymom-keo)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '580a10e5-1ad7-58bd-8b50-01b7f9c5735a',
  NULL,
  $$Individual$$,
  $$demo-sreymom-keo$$,
  $$Sreymom Keo$$,
  $$Climate Mitigation Policy Analyst | Circular Economy & Plastics | Cambodia$$,
  $$Phnom Penh, Cambodia$$,
  $$early_career$$,
  NULL,
  $$Cambodian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 200)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '280 days',
  $$https://i.pravatar.cc/150?u=demo-sreymom-keo$$,
  $$https://picsum.photos/seed/demo-sreymom-keo/800/200$$,
  $$Sreymom Keo is a policy analyst working on climate mitigation and the circular economy in Cambodia. In four years she has supported the national greenhouse gas inventory for the waste sector, analysed plastic waste flows in Phnom Penh markets, and written policy briefs on extended producer responsibility. She is comfortable with spreadsheets and basic data analysis of emissions and waste data, and has organized consultations with recyclers and informal waste pickers. Sreymom worked with a Cambodian environmental think tank before moving into consulting.$$,
  $$[{"name":"Climate Mitigation","tier":"primary","level":"item"},{"name":"Circular Economy","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Briefs","tier":"primary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Khmer$$, $$English$$]::text[],
  $$[{"organization":"Cambodian environmental think tank","role":"Research Assistant","start_year":2021,"end_year":2024,"logo_url":null,"description":"Waste and climate policy research."},{"organization":"Ministry of Environment, Cambodia","role":"Intern","start_year":2020,"end_year":2021,"logo_url":null,"description":"Supported the waste sector greenhouse gas inventory."}]$$::jsonb,
  $$[{"institution":"Royal University of Phnom Penh","degree_or_course":"BSc Environmental Science","start_year":2016,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Thiri Aung Khin (demo-thiri-aung-khin)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '134e6ab8-7482-5723-bd65-ce35cf616fc7',
  NULL,
  $$Individual$$,
  $$demo-thiri-aung-khin$$,
  $$Thiri Aung Khin$$,
  $$Peacebuilding & Social Cohesion Researcher | Conflict Analysis | Myanmar & Thai Border$$,
  $$Yangon, Myanmar$$,
  $$mid_career$$,
  NULL,
  $$Myanmar citizen; contracts as an individual. Can work from Thailand on short assignments.$$,
  ARRAY[$$Remote$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '130 days',
  $$https://i.pravatar.cc/150?u=demo-thiri-aung-khin$$,
  $$https://picsum.photos/seed/demo-thiri-aung-khin/800/200$$,
  $$Thiri Aung Khin is a peacebuilding researcher with ten years of experience in Myanmar and along the Thai border. She has conducted conflict analysis and qualitative research on inter-communal relations, local ceasefire monitoring and humanitarian access, working through trusted local networks since 2021. She translates research instruments and reports between Burmese and English and trains local researchers in safe and ethical data collection. Thiri has worked with peace support organizations, UN agencies and international NGOs, and focuses on social cohesion among displaced communities and their hosts.$$,
  $$[{"name":"Peacebuilding","tier":"primary","level":"item"},{"name":"Social Cohesion","tier":"primary","level":"item"},{"name":"Humanitarian Aid","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Translation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Burmese$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Peacebuilding Researcher","start_year":2021,"end_year":null,"logo_url":null,"description":"Conflict analysis and research for peace support and humanitarian organizations."},{"organization":"Myanmar peace support organization","role":"Research Officer","start_year":2015,"end_year":2021,"logo_url":null,"description":"Ceasefire monitoring and social cohesion research."}]$$::jsonb,
  $$[{"institution":"Yangon University","degree_or_course":"MA International Relations","start_year":2012,"end_year":2014,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Joana Ximenes Soares (demo-joana-ximenes-soares)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'fbdebe0c-c81c-5ab3-bf72-af17a8638e24',
  NULL,
  $$Individual$$,
  $$demo-joana-ximenes-soares$$,
  $$Joana Ximenes Soares$$,
  $$Citizen Engagement & Justice Access Officer | Translation Tetum–Portuguese–English | Timor-Leste$$,
  $$Dili, Timor-Leste$$,
  $$early_career$$,
  NULL,
  $$Timorese citizen; contracts as an individual.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 20)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '215 days',
  $$https://i.pravatar.cc/150?u=demo-joana-ximenes-soares$$,
  $$https://picsum.photos/seed/demo-joana-ximenes-soares/800/200$$,
  $$Joana Ximenes Soares is a citizen engagement and access-to-justice officer with three years of experience in Timor-Leste. She has organized community legal information sessions, supported municipal consultations on local development plans, and translated legal and programme documents between Tetum, Portuguese and English. She has also interpreted for donor monitoring visits and produced public outreach materials in Tetum on land rights and domestic violence law. Joana is interested in justice reform and in how local governments communicate with citizens, especially in rural sucos where written Portuguese is rarely understood.$$,
  $$[{"name":"Citizen Engagement","tier":"primary","level":"item"},{"name":"Justice Reform","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Translation","tier":"primary","level":"item"},{"name":"Interpretation","tier":"secondary","level":"item"},{"name":"Public Outreach","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Tetum$$, $$Portuguese$$, $$Indonesian$$, $$English$$]::text[],
  $$[{"organization":"Asia Foundation Timor-Leste","role":"Programme Assistant","start_year":2022,"end_year":2025,"logo_url":null,"description":"Community legal information and municipal consultations."},{"organization":"Freelance","role":"Translator","start_year":2021,"end_year":2022,"logo_url":null,"description":"Translation of legal and programme documents."}]$$::jsonb,
  $$[{"institution":"Universidade Nacional Timor Lorosa'e","degree_or_course":"Licenciatura em Direito","start_year":2016,"end_year":2021,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Bayanihan Research Cooperative (demo-bayanihan-research-cooperative)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'a8899bc2-dc39-532d-830c-fa97dad24fff',
  NULL,
  $$Small Firm$$,
  $$demo-bayanihan-research-cooperative$$,
  $$Bayanihan Research Cooperative$$,
  $$Research Cooperative | Conflict, Disaster & Inclusion Studies | Mindanao & the Philippines$$,
  $$Quezon City, Philippines$$,
  NULL,
  2015,
  $$Registered with the Cooperative Development Authority of the Philippines; contracts as a cooperative.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '23 days',
  $$https://i.pravatar.cc/150?u=demo-bayanihan-research-cooperative$$,
  $$https://picsum.photos/seed/demo-bayanihan-research-cooperative/800/200$$,
  $$Bayanihan Research Cooperative is a member-owned research cooperative of ten researchers founded in 2015. It conducts research and evaluations on conflict, displacement, disaster recovery and disability inclusion in Mindanao and across the Philippines, for UN agencies, NGOs and local governments. The cooperative combines household surveys, participatory research and workshop facilitation, and works through community researchers in the Bangsamoro region. Its recent work includes studies of returnees in Marawi, inclusive disaster risk reduction, and the transition of former combatants. Findings are always validated with the communities that took part before reports are finalized.$$,
  $$[{"name":"Fragility, Conflict & Violence","tier":"primary","level":"category"},{"name":"Disability Inclusion","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Research & Analysis","tier":"primary","level":"category"},{"name":"Workshop Facilitation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Filipino$$, $$English$$, $$Cebuano$$]::text[],
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

-- Aigerim Toktogulova (demo-aigerim-toktogulova)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'd953913c-a01a-5835-81a7-c5e81f24db6f',
  NULL,
  $$Individual$$,
  $$demo-aigerim-toktogulova$$,
  $$Aigerim Toktogulova$$,
  $$Energy Efficiency & Clean Heating Specialist | Buildings and Policy | Kyrgyzstan & Central Asia$$,
  $$Bishkek, Kyrgyzstan$$,
  $$mid_career$$,
  NULL,
  $$Kyrgyz citizen; contracts as an individual consultant.$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '26 days',
  $$https://i.pravatar.cc/150?u=demo-aigerim-toktogulova$$,
  $$https://picsum.photos/seed/demo-aigerim-toktogulova/800/200$$,
  $$Aigerim Toktogulova is an energy efficiency specialist with nine years of experience in Kyrgyzstan and Central Asia. She has worked on building retrofit programmes for schools and hospitals, clean heating alternatives to coal in rural homes, and renewable energy policy for small hydropower and solar. She facilitates dialogue between ministries, municipalities and households, and writes policy briefs on tariff reform and climate mitigation commitments. Aigerim previously coordinated an energy efficiency project at a UN agency and has worked with development banks on public building retrofits.$$,
  $$[{"name":"Energy Efficiency","tier":"primary","level":"item"},{"name":"Renewable Energy","tier":"secondary","level":"item"},{"name":"Climate Mitigation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Stakeholder Facilitation","tier":"primary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Kyrgyz$$, $$Russian$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Energy Efficiency Specialist","start_year":2021,"end_year":null,"logo_url":null,"description":"Energy efficiency and clean heating assignments in Central Asia."},{"organization":"UNDP Kyrgyzstan","role":"Project Coordinator, Energy Efficiency","start_year":2016,"end_year":2021,"logo_url":"https://cdn.brandfetch.io/undp.org","description":"Coordinated public building retrofit projects."}]$$::jsonb,
  $$[{"institution":"American University of Central Asia","degree_or_course":"BA Economics","start_year":2011,"end_year":2015,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Sherzod Yuldashev (demo-sherzod-yuldashev)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'd9a829d6-fde0-5ef0-a2ee-40506fae22c1',
  NULL,
  $$Individual$$,
  $$demo-sherzod-yuldashev$$,
  $$Sherzod Yuldashev$$,
  $$Trade Data Analyst | Trade Competitiveness & Logistics Statistics | Uzbekistan$$,
  $$Tashkent, Uzbekistan$$,
  $$early_career$$,
  NULL,
  $$Uzbek citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 60)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '260 days',
  $$https://i.pravatar.cc/150?u=demo-sherzod-yuldashev$$,
  $$https://picsum.photos/seed/demo-sherzod-yuldashev/800/200$$,
  $$Sherzod Yuldashev is a trade data analyst with three years of experience in Uzbekistan. He has analysed export diversification and trade competitiveness for a government think tank, built statistical indicators of logistics performance along Central Asian corridors, and cleaned customs and trade data in R. He supported a World Trade Organization accession working paper on tariff structures and has presented his work at regional trade facilitation forums. Sherzod is looking for assignments in trade and logistics analysis with development partners.$$,
  $$[{"name":"Trade & Competitiveness","tier":"primary","level":"item"},{"name":"Logistics & Supply Chain","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Statistical Analysis","tier":"primary","level":"item"},{"name":"Python/R","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Uzbek$$, $$Russian$$, $$English$$]::text[],
  $$[{"organization":"Uzbek government economic think tank","role":"Junior Analyst","start_year":2022,"end_year":2025,"logo_url":null,"description":"Trade and export diversification analysis."},{"organization":"Ministry of Investment, Industry and Trade","role":"Intern","start_year":2021,"end_year":2022,"logo_url":null,"description":"Supported tariff data analysis."}]$$::jsonb,
  $$[{"institution":"Westminster International University in Tashkent","degree_or_course":"BSc Economics","start_year":2017,"end_year":2021,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Mariana Ospina Restrepo (demo-mariana-ospina-restrepo)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '9d5b1987-38c1-522f-9fcc-951e7224328b',
  NULL,
  $$Individual$$,
  $$demo-mariana-ospina-restrepo$$,
  $$Mariana Ospina Restrepo$$,
  $$Urban Mobility Planner | Cable Cars, Cycling & Road Safety, GIS | Colombia & Latin America$$,
  $$Medellín, Colombia$$,
  $$senior$$,
  NULL,
  $$Colombian citizen; contracts as an individual consultant (RUT registered).$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  now() - interval '16 days',
  $$https://i.pravatar.cc/150?u=demo-mariana-ospina-restrepo$$,
  $$https://picsum.photos/seed/demo-mariana-ospina-restrepo/800/200$$,
  $$Mariana Ospina Restrepo is an urban mobility planner with sixteen years of experience in Colombian and Latin American cities. She worked on the integration of Medellín's cable cars and escalators into the public transport network, and has since planned cycling networks, safe routes to school and road safety programmes in Bogotá, Quito and Lima. Her work is grounded in GIS analysis of trips, crashes and accessibility, and in citizen engagement with neighbourhoods on the urban periphery. She uses open data and simple data science tools to show where investment improves access for low-income residents.$$,
  $$[{"name":"Urban Transport","tier":"primary","level":"item"},{"name":"Road Safety","tier":"secondary","level":"item"},{"name":"Citizen Engagement","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"GIS Mapping","tier":"primary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Urban Mobility Planner","start_year":2018,"end_year":null,"logo_url":null,"description":"Mobility planning for cities and development banks in Latin America."},{"organization":"Empresa de Transporte Masivo del Valle de Aburrá (Metro de Medellín)","role":"Planning Specialist","start_year":2010,"end_year":2018,"logo_url":null,"description":"Integration of cable cars and feeder services."}]$$::jsonb,
  $$[{"institution":"Universidad Nacional de Colombia, Medellín","degree_or_course":"MSc Urban Planning","start_year":2007,"end_year":2009,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Colibrí Estudio Visual (demo-colibri-estudio-visual)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '5f12545b-e351-5050-951d-993efe623837',
  NULL,
  $$Small Firm$$,
  $$demo-colibri-estudio-visual$$,
  $$Colibrí Estudio Visual$$,
  $$Visual Communication Studio | Motion Graphics, Branding & Subtitled Video | Latin America$$,
  $$Bogotá, Colombia$$,
  NULL,
  2015,
  $$Registered in Colombia (S.A.S.); contracts as a firm and invoices internationally in USD.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '7 days',
  $$https://i.pravatar.cc/150?u=demo-colibri-estudio-visual$$,
  $$https://picsum.photos/seed/demo-colibri-estudio-visual/800/200$$,
  $$Colibrí Estudio Visual is a Bogotá studio of seven designers and animators that works with development and human rights organizations across Latin America. Since 2015 it has produced explainer animations, motion graphics for campaigns, brand identities for programmes and networks, infographics and report layouts. The studio subtitles its videos in Spanish, English and Portuguese and adapts content for Indigenous and Afro-descendant audiences with community partners. Clients include UN agencies, foundations and regional civil-society networks working on gender equality, peace and climate.$$,
  $$[{"name":"Gender & Social Inclusion","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Motion Graphics","tier":"primary","level":"item"},{"name":"Brand Identity","tier":"primary","level":"item"},{"name":"Infographics","tier":"secondary","level":"item"},{"name":"Subtitling","tier":"secondary","level":"item"},{"name":"Publication Layout","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$, $$Portuguese$$]::text[],
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

-- Rosa Quispe Mamani (demo-rosa-quispe-mamani)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '7f19fdb3-785a-533a-b8e7-c77fa3bcd616',
  NULL,
  $$Individual$$,
  $$demo-rosa-quispe-mamani$$,
  $$Rosa Quispe Mamani$$,
  $$Indigenous Peoples & Agroecology Researcher | Quechua Interpretation | Andean Peru$$,
  $$Cusco, Peru$$,
  $$mid_career$$,
  NULL,
  $$Peruvian citizen; contracts as an individual (RUC registered).$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '55 days',
  $$https://i.pravatar.cc/150?u=demo-rosa-quispe-mamani$$,
  $$https://picsum.photos/seed/demo-rosa-quispe-mamani/800/200$$,
  $$Rosa Quispe Mamani is a Quechua-speaking researcher with nine years of experience with Indigenous Peoples and smallholder farmers in the Peruvian Andes. She conducts qualitative research on agroecology, native potato biodiversity and community land management, and has supported free, prior and informed consent processes for development projects. She interprets and translates between Quechua and Spanish for consultations and trainings, and co-designs sustainable farming projects with community authorities. Rosa has worked with national research centres, FAO and NGOs on climate resilience in high-altitude communities.$$,
  $$[{"name":"Indigenous Peoples","tier":"primary","level":"item"},{"name":"Sustainable Farming","tier":"primary","level":"item"},{"name":"Biodiversity","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Qualitative Research","tier":"primary","level":"item"},{"name":"Interpretation","tier":"secondary","level":"item"},{"name":"Translation","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$Quechua$$, $$English$$]::text[],
  $$[{"organization":"Asociación ANDES","role":"Researcher","start_year":2019,"end_year":null,"logo_url":null,"description":"Research with Quechua communities on agrobiodiversity."},{"organization":"Centro Bartolomé de las Casas","role":"Field Researcher","start_year":2016,"end_year":2019,"logo_url":null,"description":"Community research in Cusco and Apurímac."}]$$::jsonb,
  $$[{"institution":"Universidad Nacional de San Antonio Abad del Cusco","degree_or_course":"Licenciatura en Antropología","start_year":2010,"end_year":2015,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'pending',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Álvaro Choque Mendoza (demo-alvaro-choque-mendoza)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '8e3cee7c-7992-5539-8a05-3c342a9820c1',
  NULL,
  $$Individual$$,
  $$demo-alvaro-choque-mendoza$$,
  $$Álvaro Choque Mendoza$$,
  $$Irrigation & Climate Adaptation Engineer | Andean Water Projects | Bolivia & Peru$$,
  $$La Paz, Bolivia$$,
  $$senior$$,
  NULL,
  $$Bolivian citizen; contracts as an individual or through his engineering firm (NIT registered).$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '13 days',
  $$https://i.pravatar.cc/150?u=demo-alvaro-choque-mendoza$$,
  $$https://picsum.photos/seed/demo-alvaro-choque-mendoza/800/200$$,
  $$Álvaro Choque Mendoza is an agricultural engineer with twenty years of experience in irrigation and climate adaptation in the Bolivian and Peruvian Andes. He has designed and managed small irrigation systems, micro-dams and water harvesting for farming communities facing glacier retreat and erratic rainfall, and has led the irrigation components of national and donor-funded programmes. He manages multi-disciplinary teams through design, construction and handover to water user organizations, and supports the change management needed when communities shift to new water allocation rules. Álvaro speaks Aymara and works directly with community water committees.$$,
  $$[{"name":"Irrigation Systems","tier":"primary","level":"item"},{"name":"Climate Adaptation","tier":"primary","level":"item"},{"name":"Water Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Project Management","tier":"primary","level":"item"},{"name":"Change Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Registered Agricultural Engineer","issuing_organization":"Sociedad de Ingenieros de Bolivia","year":2006,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Spanish$$, $$Aymara$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Irrigation and Adaptation Engineer","start_year":2016,"end_year":null,"logo_url":null,"description":"Irrigation design and programme management in the Andes."},{"organization":"Ministerio de Medio Ambiente y Agua, Bolivia (MiRiego programme)","role":"Regional Coordinator","start_year":2009,"end_year":2016,"logo_url":null,"description":"Managed irrigation investments in La Paz and Oruro."}]$$::jsonb,
  $$[{"institution":"Universidad Mayor de San Andrés","degree_or_course":"Ingeniería Agronómica","start_year":1999,"end_year":2004,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Beatriz Nogueira Lima (demo-beatriz-nogueira-lima)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '02174de5-f172-5594-a5e1-ab29b735538d',
  NULL,
  $$Individual$$,
  $$demo-beatriz-nogueira-lima$$,
  $$Beatriz Nogueira Lima$$,
  $$Social Protection & Education Evaluator | Cash Transfers, Impact Evaluation | Brazil & Latin America$$,
  $$Brasília, Brazil$$,
  $$senior$$,
  NULL,
  $$Brazilian citizen; contracts as an individual or through her MEI/LTDA in Brasília.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 90)::text, 'until', NULL),
  now() - interval '5 days',
  $$https://i.pravatar.cc/150?u=demo-beatriz-nogueira-lima$$,
  $$https://picsum.photos/seed/demo-beatriz-nogueira-lima/800/200$$,
  $$Beatriz Nogueira Lima is an economist who has evaluated social protection and primary education policies in Brazil and Latin America for nineteen years. She has led impact evaluations of conditional cash transfers, early childhood programmes and school meals, and advised ministries in Brazil, Paraguay and Mozambique on cash transfer design. Her policy analysis links evaluation evidence to budget and targeting decisions, and her statistical analysis of administrative registries is widely cited. Beatriz previously coordinated evaluation at Brazil's social development ministry and has taught at the University of Brasília.$$,
  $$[{"name":"Social Protection","tier":"primary","level":"item"},{"name":"Primary Education","tier":"primary","level":"item"},{"name":"Nutrition","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Policy Analysis","tier":"primary","level":"item"},{"name":"Statistical Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Portuguese$$, $$Spanish$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Social Protection Evaluator","start_year":2017,"end_year":null,"logo_url":null,"description":"Evaluations and policy advice for governments and international organizations."},{"organization":"Ministério do Desenvolvimento Social, Brazil","role":"Evaluation Coordinator","start_year":2009,"end_year":2017,"logo_url":null,"description":"Coordinated evaluations of cash transfer and food security programmes."}]$$::jsonb,
  $$[{"institution":"Universidade de São Paulo","degree_or_course":"PhD Economics","start_year":2003,"end_year":2008,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Rafael Tavares Moura (demo-rafael-tavares-moura)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '70c1e3de-d2ab-5d27-9e09-cd1654aeda5e',
  NULL,
  $$Individual$$,
  $$demo-rafael-tavares-moura$$,
  $$Rafael Tavares Moura$$,
  $$Renewable Energy Data Analyst | Solar & Wind Modelling in Python | Brazil$$,
  $$Recife, Brazil$$,
  $$early_career$$,
  NULL,
  $$Brazilian citizen; contracts as an individual (MEI).$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 180)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '265 days',
  $$https://i.pravatar.cc/150?u=demo-rafael-tavares-moura$$,
  $$https://picsum.photos/seed/demo-rafael-tavares-moura/800/200$$,
  $$Rafael Tavares Moura is a data analyst working on renewable energy in north-east Brazil. In three years he has written Python models of solar and wind generation, analysed curtailment and grid data for a state energy agency, and built simple financial models for distributed solar in public buildings. He has also contributed to a study on recycling end-of-life solar panels within a circular economy framework. Rafael is comfortable with large time-series datasets and dashboards, and is looking for international assignments on energy transition analytics.$$,
  $$[{"name":"Renewable Energy","tier":"primary","level":"item"},{"name":"Circular Economy","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Python/R","tier":"primary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"},{"name":"Financial Modeling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Portuguese$$, $$English$$]::text[],
  $$[{"organization":"State energy agency (Pernambuco)","role":"Data Analyst","start_year":2022,"end_year":2025,"logo_url":null,"description":"Generation and grid data analysis."},{"organization":"Universidade Federal de Pernambuco","role":"Research Assistant","start_year":2020,"end_year":2022,"logo_url":null,"description":"Solar resource modelling."}]$$::jsonb,
  $$[{"institution":"Universidade Federal de Pernambuco","degree_or_course":"BSc Electrical Engineering","start_year":2016,"end_year":2021,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Gabriela Andrade Paredes (demo-gabriela-andrade-paredes)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '56cbb2d3-a0f7-5dee-8825-8623abe152d3',
  NULL,
  $$Individual$$,
  $$demo-gabriela-andrade-paredes$$,
  $$Gabriela Andrade Paredes$$,
  $$Migration & Refugee Response Researcher | Venezuelan Displacement, Surveys | Ecuador & Andean Region$$,
  $$Quito, Ecuador$$,
  $$mid_career$$,
  NULL,
  $$Ecuadorian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '85 days',
  $$https://i.pravatar.cc/150?u=demo-gabriela-andrade-paredes$$,
  $$https://picsum.photos/seed/demo-gabriela-andrade-paredes/800/200$$,
  $$Gabriela Andrade Paredes researches migration and refugee response in Ecuador and the Andean region. Over nine years she has designed surveys of Venezuelan refugees and migrants on livelihoods, protection risks and integration, conducted qualitative research on xenophobia and social cohesion in border towns, and studied gender-based violence risks along migration routes. She works with UN agencies, NGOs and municipal governments, and turns data into practical recommendations for local integration policies. Gabriela previously coordinated the information management unit of a regional refugee response platform.$$,
  $$[{"name":"Refugee Support","tier":"primary","level":"item"},{"name":"Social Cohesion","tier":"secondary","level":"item"},{"name":"Gender-Based Violence","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Survey Design","tier":"primary","level":"item"},{"name":"Qualitative Research","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Migration Researcher","start_year":2021,"end_year":null,"logo_url":null,"description":"Research for UN agencies and NGOs on displacement in the Andes."},{"organization":"Regional refugee response platform (R4V), Ecuador","role":"Information Management Coordinator","start_year":2018,"end_year":2021,"logo_url":null,"description":"Coordinated joint needs assessments."}]$$::jsonb,
  $$[{"institution":"FLACSO Ecuador","degree_or_course":"MA Sociology","start_year":2014,"end_year":2016,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Andina Consultores Asociados (demo-andina-consultores-asociados)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'b258631a-c933-509f-a5d7-883074f6db01',
  NULL,
  $$Large Firm$$,
  $$demo-andina-consultores-asociados$$,
  $$Andina Consultores Asociados$$,
  $$Multi-Sector Consulting Firm | Governance, Infrastructure & Private Sector | Andean Region$$,
  $$Lima, Peru$$,
  NULL,
  1994,
  $$Registered in Peru (S.A.C.) with branches in Bogotá and La Paz; contracts as a firm and is registered with major development bank procurement systems.$$,
  ARRAY[$$On-site$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '30 days',
  $$https://i.pravatar.cc/150?u=demo-andina-consultores-asociados$$,
  $$https://picsum.photos/seed/demo-andina-consultores-asociados/800/200$$,
  $$Andina Consultores Asociados is a Lima-based consulting firm of 160 professionals founded in 1994, with branches in Bogotá and La Paz. It works across governance and institutional reform, infrastructure and transport, and private sector development for governments and development banks in the Andean region. Its services include institutional assessments, public investment and procurement process reviews, feasibility studies, programme management and policy analysis. The firm has led more than 400 assignments, including reforms of public investment systems, regional road programmes and business environment diagnostics.$$,
  $$[{"name":"Governance & Institutional","tier":"primary","level":"category"},{"name":"Infrastructure & Transport","tier":"primary","level":"category"},{"name":"Private Sector Development","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Strategic & Operations","tier":"primary","level":"category"},{"name":"Policy Analysis","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"SGS del Perú","year":2012,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$, $$Portuguese$$]::text[],
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

-- Widline Pierre-Louis (demo-widline-pierre-louis)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'f64f6f86-2408-52d4-8ac6-41b561567ba0',
  NULL,
  $$Individual$$,
  $$demo-widline-pierre-louis$$,
  $$Widline Pierre-Louis$$,
  $$Humanitarian Programme & Recovery Specialist | Interpretation Creole–French–English | Haiti$$,
  $$Port-au-Prince, Haiti$$,
  $$senior$$,
  NULL,
  $$Haitian citizen; contracts as an individual. Can work from the Dominican Republic when access to Haiti is restricted.$$,
  ARRAY[$$On-site$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date + 120)::text),
  now() - interval '22 days',
  $$https://i.pravatar.cc/150?u=demo-widline-pierre-louis$$,
  $$https://picsum.photos/seed/demo-widline-pierre-louis/800/200$$,
  $$Widline Pierre-Louis has worked in humanitarian response and recovery in Haiti for sixteen years, from the 2010 earthquake through hurricane, cholera and displacement crises. She has managed WASH and shelter recovery projects, coordinated community committees in displacement sites, and led project management for reconstruction programmes in the south. She is also a trusted interpreter and translator between Haitian Creole, French and English for assessments, community meetings and donor visits. Widline is known for keeping programmes running in insecure conditions through strong local relationships.$$,
  $$[{"name":"Humanitarian Aid","tier":"primary","level":"item"},{"name":"Post-Conflict Reconstruction","tier":"primary","level":"item"},{"name":"WASH","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Interpretation","tier":"primary","level":"item"},{"name":"Translation","tier":"secondary","level":"item"},{"name":"Project Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Haitian Creole$$, $$French$$, $$English$$, $$Spanish$$]::text[],
  $$[{"organization":"International NGO (Haiti)","role":"Recovery Programme Manager","start_year":2016,"end_year":2024,"logo_url":null,"description":"Managed shelter and WASH recovery in the Grand Sud."},{"organization":"IOM Haiti","role":"Camp Coordination Assistant","start_year":2010,"end_year":2016,"logo_url":null,"description":"Coordinated displacement sites after the earthquake."}]$$::jsonb,
  $$[{"institution":"Université d'État d'Haïti","degree_or_course":"Licence en Sciences Sociales","start_year":2005,"end_year":2009,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Yokasta Féliz Matos (demo-yokasta-feliz-matos)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'fec58f0d-95a0-581d-841d-7c5c9b5d7ade',
  NULL,
  $$Individual$$,
  $$demo-yokasta-feliz-matos$$,
  $$Yokasta Féliz Matos$$,
  $$Climate Communications Officer | Social Media & Public Outreach | Dominican Republic & Caribbean$$,
  $$Santo Domingo, Dominican Republic$$,
  $$early_career$$,
  NULL,
  $$Dominican citizen; contracts as an individual (RNC registered).$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 150)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '205 days',
  $$https://i.pravatar.cc/150?u=demo-yokasta-feliz-matos$$,
  $$https://picsum.photos/seed/demo-yokasta-feliz-matos/800/200$$,
  $$Yokasta Féliz Matos is a communications officer focused on climate adaptation and disaster preparedness in the Caribbean. In three years she has run social media for a regional climate programme, written copy for hurricane preparedness campaigns, and organized public outreach in coastal communities about supply chain disruptions and emergency stocks. She produces short videos and graphics for mobile audiences and tracks campaign reach with simple analytics. Yokasta is building a career in climate and disaster risk communication. She writes in Spanish and English and is learning basic Haitian Creole to reach border communities.$$,
  $$[{"name":"Climate Adaptation","tier":"primary","level":"item"},{"name":"Logistics & Supply Chain","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Social Media","tier":"primary","level":"item"},{"name":"Copywriting","tier":"secondary","level":"item"},{"name":"Public Outreach","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Spanish$$, $$English$$]::text[],
  $$[{"organization":"Regional climate resilience programme","role":"Communications Assistant","start_year":2022,"end_year":2025,"logo_url":null,"description":"Social media and campaigns."},{"organization":"Dominican Red Cross","role":"Volunteer, Communications","start_year":2020,"end_year":2022,"logo_url":null,"description":"Preparedness messaging."}]$$::jsonb,
  $$[{"institution":"Pontificia Universidad Católica Madre y Maestra","degree_or_course":"Licenciatura en Comunicación Social","start_year":2016,"end_year":2020,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Caldera Development Group (demo-caldera-development-group)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '1822087b-cdc6-5377-9b7f-bbcd0d03043c',
  NULL,
  $$Large Firm$$,
  $$demo-caldera-development-group$$,
  $$Caldera Development Group$$,
  $$International Development Contractor | Governance, Private Sector & Program Management | Global$$,
  $$Washington DC, United States$$,
  NULL,
  1987,
  $$US corporation registered in SAM; contracts as a prime or subcontractor on USAID, MCC, World Bank and FCDO awards. Field offices in 14 countries.$$,
  ARRAY[$$On-site$$, $$Hybrid$$, $$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '12 days',
  $$https://i.pravatar.cc/150?u=demo-caldera-development-group$$,
  $$https://picsum.photos/seed/demo-caldera-development-group/800/200$$,
  $$Caldera Development Group is a Washington DC development contractor of about 600 staff founded in 1987, with field offices in 14 countries. It designs and implements large programmes in governance and institutional reform and private sector development, and provides strategy and operations support to ministries and development agencies. Its programmes have covered public financial management, local governance, trade and investment, and enterprise development in Latin America, Africa, the Middle East and Asia. The firm brings programme management systems, research and analysis teams, and a roster of technical experts in English, Spanish, French and Arabic.$$,
  $$[{"name":"Governance & Institutional","tier":"primary","level":"category"},{"name":"Private Sector Development","tier":"primary","level":"category"}]$$::jsonb,
  $$[{"name":"Strategic & Operations","tier":"primary","level":"category"},{"name":"Research & Analysis","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"ISO 9001:2015 Quality Management","issuing_organization":"BSI","year":2014,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$English$$, $$Spanish$$, $$French$$, $$Arabic$$]::text[],
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

-- Rebecca Thornton Hale (demo-rebecca-thornton-hale)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'a60c0d49-69cf-5939-8c0b-bac2fa05d355',
  NULL,
  $$Individual$$,
  $$demo-rebecca-thornton-hale$$,
  $$Rebecca Thornton Hale$$,
  $$Speechwriter & Ghostwriter for Development Leaders | Op-Eds, Speeches, Media | Washington DC$$,
  $$Washington DC, United States$$,
  $$senior$$,
  NULL,
  $$US citizen; contracts as an individual through her single-member LLC.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '60 days',
  $$https://i.pravatar.cc/150?u=demo-rebecca-thornton-hale$$,
  $$https://picsum.photos/seed/demo-rebecca-thornton-hale/800/200$$,
  $$Rebecca Thornton Hale has written speeches, op-eds and books for leaders of development institutions for twenty years. She was a senior speechwriter at a multilateral development bank and has since ghostwritten for heads of foundations, ministers and NGO chief executives. She prepares leaders for high-profile media interviews, drafts policy briefs and keynote addresses on governance, debt and climate finance, and edits annual letters. Rebecca is known for finding a leader's own voice and for working discreetly to tight timelines. She also coaches communications teams on building a consistent voice across speeches, blogs and social media.$$,
  $$[{"name":"Governance & Institutional","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Speechwriting","tier":"primary","level":"item"},{"name":"Ghostwriting","tier":"primary","level":"item"},{"name":"Media Relations","tier":"secondary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Spanish$$]::text[],
  $$[{"organization":"Independent","role":"Speechwriter and Ghostwriter","start_year":2015,"end_year":null,"logo_url":null,"description":"Writing for leaders of development institutions."},{"organization":"Multilateral development bank (Washington DC)","role":"Senior Speechwriter","start_year":2006,"end_year":2015,"logo_url":null,"description":"Speeches and op-eds for senior management."}]$$::jsonb,
  $$[{"institution":"Georgetown University","degree_or_course":"MA Communication, Culture & Technology","start_year":2003,"end_year":2005,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Mathieu Gagnon-Leblanc (demo-mathieu-gagnon-leblanc)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'e0b081d3-8f5c-5ad2-9938-39236da09711',
  NULL,
  $$Individual$$,
  $$demo-mathieu-gagnon-leblanc$$,
  $$Mathieu Gagnon-Leblanc$$,
  $$French–English–Spanish Translator | Transcreation, Localization & Subtitles for Development | Montreal$$,
  $$Montreal, Canada$$,
  $$mid_career$$,
  NULL,
  $$Canadian citizen; invoices as a sole proprietor (GST/QST registered).$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '4 days',
  $$https://i.pravatar.cc/150?u=demo-mathieu-gagnon-leblanc$$,
  $$https://picsum.photos/seed/demo-mathieu-gagnon-leblanc/800/200$$,
  $$Mathieu Gagnon-Leblanc is a certified translator working between French, English and Spanish for development and humanitarian organizations. Over twelve years he has translated evaluation reports, policy papers and training materials, transcreated campaign content so that it works for Francophone African and Latin American audiences, and managed localization of e-learning courses and websites. He also produces subtitles for documentaries and webinars. Mathieu has worked for UN agencies, Canadian NGOs and global health partnerships, and is fast, consistent and careful with technical terminology.$$,
  $$[{"name":"Human Development","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Translation","tier":"primary","level":"item"},{"name":"Transcreation","tier":"primary","level":"item"},{"name":"Localization","tier":"secondary","level":"item"},{"name":"Subtitling","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Certified Translator (French–English)","issuing_organization":"Ordre des traducteurs, terminologues et interprètes agréés du Québec (OTTIAQ)","year":2014,"credential_id_or_url":null}]$$::jsonb,
  ARRAY[$$French$$, $$English$$, $$Spanish$$]::text[],
  $$[{"organization":"Freelance","role":"Translator","start_year":2016,"end_year":null,"logo_url":null,"description":"Translation and localization for development organizations."},{"organization":"Global health partnership (Geneva)","role":"Translator","start_year":2013,"end_year":2016,"logo_url":null,"description":"In-house French translation."}]$$::jsonb,
  $$[{"institution":"Université de Montréal","degree_or_course":"BA Traduction","start_year":2009,"end_year":2012,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Priyanka Desai Mehra (demo-priyanka-desai-mehra)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'da94e4d4-5b84-5543-8e66-64631454aacc',
  NULL,
  $$Individual$$,
  $$demo-priyanka-desai-mehra$$,
  $$Priyanka Desai Mehra$$,
  $$Climate Finance Analyst | Renewable Energy & Mitigation Modelling | Toronto$$,
  $$Toronto, Canada$$,
  $$early_career$$,
  NULL,
  $$Canadian permanent resident; contracts as an individual.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 30)::text, 'until', NULL),
  now() - interval '9 days',
  $$https://i.pravatar.cc/150?u=demo-priyanka-desai-mehra$$,
  $$https://picsum.photos/seed/demo-priyanka-desai-mehra/800/200$$,
  $$Priyanka Desai Mehra is a climate finance analyst with four years of experience on renewable energy and climate mitigation. She builds financial models for solar, wind and energy efficiency projects in emerging markets, estimates emissions reductions for carbon finance, and analyses data on climate fund portfolios. She has worked for a Toronto-based climate investment advisory and supported project preparation for clean energy developers in India and East Africa. Priyanka is completing the CFA programme and is interested in blended finance for the energy transition.$$,
  $$[{"name":"Climate Mitigation","tier":"primary","level":"item"},{"name":"Renewable Energy","tier":"primary","level":"item"},{"name":"Energy Efficiency","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Data Science","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Hindi$$, $$Gujarati$$]::text[],
  $$[{"organization":"Climate investment advisory (Toronto)","role":"Analyst","start_year":2022,"end_year":null,"logo_url":null,"description":"Financial modelling and emissions analysis for clean energy projects."},{"organization":"Clean energy developer (Ahmedabad)","role":"Analyst Intern","start_year":2021,"end_year":2022,"logo_url":null,"description":"Project finance support."}]$$::jsonb,
  $$[{"institution":"University of Toronto","degree_or_course":"Master of Global Affairs","start_year":2020,"end_year":2022,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Daniel Whitfield Okoro (demo-daniel-whitfield-okoro)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '6f6a48d2-fb5a-5d93-856b-5ce3d151d98a',
  NULL,
  $$Individual$$,
  $$demo-daniel-whitfield-okoro$$,
  $$Daniel Whitfield Okoro$$,
  $$Data Scientist for Crisis Analytics | Python, Dashboards & Databases | New York$$,
  $$New York, United States$$,
  $$early_career$$,
  NULL,
  $$US citizen; contracts as an individual.$$,
  ARRAY[$$Remote$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', (current_date - 240)::text),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '330 days',
  $$https://i.pravatar.cc/150?u=demo-daniel-whitfield-okoro$$,
  $$https://picsum.photos/seed/demo-daniel-whitfield-okoro/800/200$$,
  $$Daniel Whitfield Okoro is a data scientist working on crisis and conflict analytics. In three years he has built Python pipelines that combine conflict event data, displacement figures and food prices, developed web dashboards for humanitarian coordination teams, and managed databases for a conflict early-warning project. He has worked with a UN data team and a university research lab on fragility indicators. Daniel enjoys building tools that non-technical colleagues can use and is looking for remote data roles with humanitarian and peacebuilding organizations.$$,
  $$[{"name":"Fragility, Conflict & Violence","tier":"secondary","level":"category"}]$$::jsonb,
  $$[{"name":"Data Science","tier":"primary","level":"item"},{"name":"Python/R","tier":"primary","level":"item"},{"name":"Web Development","tier":"secondary","level":"item"},{"name":"Database Management","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$Spanish$$]::text[],
  $$[{"organization":"UN humanitarian data team (New York)","role":"Data Science Consultant","start_year":2023,"end_year":2024,"logo_url":null,"description":"Data pipelines and dashboards."},{"organization":"University research lab on political violence","role":"Research Assistant","start_year":2021,"end_year":2023,"logo_url":null,"description":"Conflict event data processing."}]$$::jsonb,
  $$[{"institution":"Columbia University","degree_or_course":"MS Data Science","start_year":2020,"end_year":2021,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Margaret Ellison Shaw (demo-margaret-ellison-shaw)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '340f760f-5bd6-5468-b5dc-61786475bc03',
  NULL,
  $$Individual$$,
  $$demo-margaret-ellison-shaw$$,
  $$Margaret Ellison Shaw$$,
  $$Higher Education Evaluation Expert | Impact Evaluation, University Reform | Boston$$,
  $$Boston, United States$$,
  $$senior$$,
  NULL,
  $$US citizen; contracts as an individual or through her S-corporation.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'unavailable', 'from', NULL, 'until', NULL),
  now() - interval '18 days',
  $$https://i.pravatar.cc/150?u=demo-margaret-ellison-shaw$$,
  $$https://picsum.photos/seed/demo-margaret-ellison-shaw/800/200$$,
  $$Margaret Ellison Shaw has evaluated higher education and research system reforms in Africa, Latin America and the Middle East for twenty-two years. She has led impact evaluations of scholarship programmes, university partnerships and innovation grants, and advised ministries on tertiary education quality assurance. She mentors early-career evaluators from the countries where she works and edits an academic journal on comparative education. Margaret was previously a professor of education policy and directed an evaluation centre at a Boston university. She works in English and French and has led evaluation teams in more than twenty countries.$$,
  $$[{"name":"Tertiary Education","tier":"primary","level":"item"},{"name":"Innovation Ecosystems","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Impact Evaluation","tier":"primary","level":"item"},{"name":"Academic Editing","tier":"secondary","level":"item"},{"name":"Mentoring","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$English$$, $$French$$]::text[],
  $$[{"organization":"Independent consultant","role":"Higher Education Evaluator","start_year":2016,"end_year":null,"logo_url":null,"description":"Evaluations for foundations and development agencies."},{"organization":"Boston university","role":"Professor of Education Policy; Director, Evaluation Centre","start_year":2002,"end_year":2016,"logo_url":null,"description":"Taught and led evaluations."}]$$::jsonb,
  $$[{"institution":"Stanford University","degree_or_course":"PhD Education","start_year":1996,"end_year":2001,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Salma El Idrissi (demo-salma-el-idrissi)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  '48fe6665-9238-5e21-b240-465e05bb93c2',
  NULL,
  $$Individual$$,
  $$demo-salma-el-idrissi$$,
  $$Salma El Idrissi$$,
  $$Gender-Responsive Budgeting Expert | Public Finance & Gender Mainstreaming | Morocco & MENA$$,
  $$Rabat, Morocco$$,
  $$senior$$,
  NULL,
  $$Moroccan citizen; contracts as an individual (auto-entrepreneur status) or through her SARL.$$,
  ARRAY[$$Hybrid$$, $$On-site$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_from', 'from', (current_date + 60)::text, 'until', NULL),
  now() - interval '10 days',
  $$https://i.pravatar.cc/150?u=demo-salma-el-idrissi$$,
  $$https://picsum.photos/seed/demo-salma-el-idrissi/800/200$$,
  $$Salma El Idrissi is one of the architects of gender-responsive budgeting in Morocco's public finance reform, with twenty years of experience across the Middle East and North Africa. At the Ministry of Economy and Finance she coordinated the gender budget report annexed to the finance law, and she has since advised finance ministries in Tunisia, Jordan, Egypt and Mauritania on gender budgeting and gender mainstreaming in performance budgets. She designs training of trainers programmes for budget officers and policy analysis on the gender impact of tax and social protection reforms. Salma works in Arabic, French and English.$$,
  $$[{"name":"Gender Budgeting","tier":"primary","level":"item"},{"name":"Gender Mainstreaming","tier":"primary","level":"item"},{"name":"Social Protection","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Policy Analysis","tier":"primary","level":"item"},{"name":"Training of Trainers","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$French$$, $$English$$, $$Tamazight$$]::text[],
  $$[{"organization":"Independent consultant","role":"Gender Budgeting Expert","start_year":2016,"end_year":null,"logo_url":null,"description":"Advisory to finance ministries and UN Women in MENA."},{"organization":"Ministère de l'Économie et des Finances, Morocco","role":"Coordinator, Gender Budget Centre of Excellence","start_year":2006,"end_year":2016,"logo_url":null,"description":"Coordinated the annual gender budget report."}]$$::jsonb,
  $$[{"institution":"Université Mohammed V de Rabat","degree_or_course":"Doctorat en Sciences Économiques","start_year":2000,"end_year":2005,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  true,
  'verified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Youssef Ben Amor (demo-youssef-ben-amor)
INSERT INTO profiles (id, user_id, consultant_type, handle, name, headline, location, career_level, year_founded, contracting_work_eligibility, work_types, part_time_availability, full_time_availability, availability_updated_at, photo_url, cover_image_url, detailed_bio, expertise, skills, accreditations, languages, work_history, education_history, additional_experience, is_premium, verification_status, subscription_status, approval_status, is_demo) VALUES (
  'a6e72473-3cd0-5066-a102-96b450f50c03',
  NULL,
  $$Individual$$,
  $$demo-youssef-ben-amor$$,
  $$Youssef Ben Amor$$,
  $$Investment Climate & Trade Economist | Export Competitiveness, Financial Models | Tunisia & North Africa$$,
  $$Tunis, Tunisia$$,
  $$mid_career$$,
  NULL,
  $$Tunisian citizen; contracts as an individual consultant.$$,
  ARRAY[$$Remote$$, $$Hybrid$$]::text[],
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  jsonb_build_object('status', 'available_now', 'from', NULL, 'until', NULL),
  now() - interval '40 days',
  $$https://i.pravatar.cc/150?u=demo-youssef-ben-amor$$,
  $$https://picsum.photos/seed/demo-youssef-ben-amor/800/200$$,
  $$Youssef Ben Amor is an economist with eleven years of experience on investment climate and trade competitiveness in Tunisia, Morocco and Libya. He has prepared diagnostics of business regulation, analysed export performance of olive oil, textiles and automotive components, and built financial models for investment incentive schemes and SME support funds. His policy briefs on investment law reform and regional trade agreements are used by ministries and business associations. Youssef previously worked at Tunisia's foreign investment promotion agency. He works in Arabic, French and English and regularly presents findings to private-sector councils.$$,
  $$[{"name":"Investment Climate","tier":"primary","level":"item"},{"name":"Trade & Competitiveness","tier":"primary","level":"item"},{"name":"SME Support","tier":"secondary","level":"item"}]$$::jsonb,
  $$[{"name":"Financial Modeling","tier":"primary","level":"item"},{"name":"Policy Briefs","tier":"secondary","level":"item"}]$$::jsonb,
  $$[]$$::jsonb,
  ARRAY[$$Arabic$$, $$French$$, $$English$$]::text[],
  $$[{"organization":"Independent consultant","role":"Trade and Investment Economist","start_year":2019,"end_year":null,"logo_url":null,"description":"Diagnostics and modelling for development partners."},{"organization":"Foreign Investment Promotion Agency, Tunisia","role":"Economist","start_year":2014,"end_year":2019,"logo_url":null,"description":"Investor surveys and incentive analysis."}]$$::jsonb,
  $$[{"institution":"Université de Tunis El Manar","degree_or_course":"Master en Économie Internationale","start_year":2011,"end_year":2013,"logo_url":null}]$$::jsonb,
  $$[]$$::jsonb,
  false,
  'unverified',
  'active',
  'approved',
  true
)
ON CONFLICT (handle) DO UPDATE SET user_id = EXCLUDED.user_id, consultant_type = EXCLUDED.consultant_type, handle = EXCLUDED.handle, name = EXCLUDED.name, headline = EXCLUDED.headline, location = EXCLUDED.location, career_level = EXCLUDED.career_level, year_founded = EXCLUDED.year_founded, contracting_work_eligibility = EXCLUDED.contracting_work_eligibility, work_types = EXCLUDED.work_types, part_time_availability = EXCLUDED.part_time_availability, full_time_availability = EXCLUDED.full_time_availability, availability_updated_at = EXCLUDED.availability_updated_at, photo_url = EXCLUDED.photo_url, cover_image_url = EXCLUDED.cover_image_url, detailed_bio = EXCLUDED.detailed_bio, expertise = EXCLUDED.expertise, skills = EXCLUDED.skills, accreditations = EXCLUDED.accreditations, languages = EXCLUDED.languages, work_history = EXCLUDED.work_history, education_history = EXCLUDED.education_history, additional_experience = EXCLUDED.additional_experience, is_premium = EXCLUDED.is_premium, verification_status = EXCLUDED.verification_status, subscription_status = EXCLUDED.subscription_status, approval_status = EXCLUDED.approval_status, is_demo = EXCLUDED.is_demo;

-- Portfolio items for this part: replace wholesale.
DELETE FROM portfolio_items WHERE profile_id IN (SELECT id FROM profiles WHERE handle IN ($$demo-sana-rizvi-hussain$$, $$demo-sreymom-keo$$, $$demo-thiri-aung-khin$$, $$demo-joana-ximenes-soares$$, $$demo-bayanihan-research-cooperative$$, $$demo-aigerim-toktogulova$$, $$demo-sherzod-yuldashev$$, $$demo-mariana-ospina-restrepo$$, $$demo-colibri-estudio-visual$$, $$demo-rosa-quispe-mamani$$, $$demo-alvaro-choque-mendoza$$, $$demo-beatriz-nogueira-lima$$, $$demo-rafael-tavares-moura$$, $$demo-gabriela-andrade-paredes$$, $$demo-andina-consultores-asociados$$, $$demo-widline-pierre-louis$$, $$demo-yokasta-feliz-matos$$, $$demo-caldera-development-group$$, $$demo-rebecca-thornton-hale$$, $$demo-mathieu-gagnon-leblanc$$, $$demo-priyanka-desai-mehra$$, $$demo-daniel-whitfield-okoro$$, $$demo-margaret-ellison-shaw$$, $$demo-salma-el-idrissi$$, $$demo-youssef-ben-amor$$));

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-sana-rizvi-hussain$$), $$Women-Owned SME Credit Demand Study$$, $$IFC$$, 2021, 2022, $$Team Leader$$, $$Led market research with 1,500 women-owned businesses and 15 banks on credit demand and lending barriers.$$, $$Three banks launched women-focused SME products after the study.$$, $$https://picsum.photos/seed/demo-sana-rizvi-hussain-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sana-rizvi-hussain-portfolio-1-img1/900/600","caption":"Interview with a women entrepreneur in Hyderabad"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-sana-rizvi-hussain$$), $$Gender Targets in the National Financial Inclusion Strategy$$, $$State Bank of Pakistan$$, 2019, 2020, $$Advisor$$, $$Advised on gender-disaggregated targets and supporting policies for the financial inclusion strategy.$$, $$Strategy adopted a target of 20 million women with accounts.$$, $$https://picsum.photos/seed/demo-sana-rizvi-hussain-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sana-rizvi-hussain-portfolio-2-img1/900/600","caption":"Strategy launch event"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-sreymom-keo$$), $$Plastic Waste Flow Analysis, Phnom Penh Markets$$, $$UNDP Cambodia$$, 2022, 2023, $$Research Assistant$$, $$Measured plastic waste generation and recycling in eight markets and interviewed recyclers and waste pickers.$$, $$Findings fed into the city's plastic reduction plan.$$, $$https://picsum.photos/seed/demo-sreymom-keo-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sreymom-keo-portfolio-1-img1/900/600","caption":"Waste sorting at a market"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-sreymom-keo$$), $$Extended Producer Responsibility Policy Brief$$, $$Cambodian environmental think tank$$, 2023, 2023, $$Author$$, $$Wrote a policy brief comparing extended producer responsibility schemes in the region.$$, $$Brief presented to the inter-ministerial waste committee.$$, $$https://picsum.photos/seed/demo-sreymom-keo-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sreymom-keo-portfolio-2-img1/900/600","caption":"Policy brief cover"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-thiri-aung-khin$$), $$Social Cohesion Among Displaced and Host Communities$$, $$Humanitarian donor consortium$$, 2022, 2023, $$Research Lead$$, $$Led qualitative research on relations between displaced people and host villages in the south-east, through local research partners.$$, $$Findings shaped conflict-sensitive aid distribution guidelines.$$, $$https://picsum.photos/seed/demo-thiri-aung-khin-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-thiri-aung-khin-portfolio-1-img1/900/600","caption":"Research partner training (remote)"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-thiri-aung-khin$$), $$Local Ceasefire Monitoring Review$$, $$Myanmar peace support organization$$, 2018, 2019, $$Researcher$$, $$Reviewed community-based ceasefire monitoring mechanisms in two states.$$, $$Review informed training for community monitors.$$, $$https://picsum.photos/seed/demo-thiri-aung-khin-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-thiri-aung-khin-portfolio-2-img1/900/600","caption":"Community monitors meeting"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-joana-ximenes-soares$$), $$Community Legal Information Sessions, Ermera and Liquiçá$$, $$The Asia Foundation$$, 2022, 2024, $$Programme Assistant$$, $$Organized community sessions on land rights and domestic violence law with public outreach materials in Tetum.$$, $$110 sessions reached about 6,000 people.$$, $$https://picsum.photos/seed/demo-joana-ximenes-soares-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-joana-ximenes-soares-portfolio-1-img1/900/600","caption":"Community legal session in Ermera"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-joana-ximenes-soares$$), $$Municipal Development Plan Consultations$$, $$Ministry of State Administration, Timor-Leste$$, 2023, 2023, $$Facilitator and Interpreter$$, $$Supported citizen engagement in municipal planning consultations, interpreting between Tetum and Portuguese.$$, $$Consultation inputs incorporated into two municipal plans.$$, $$https://picsum.photos/seed/demo-joana-ximenes-soares-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-joana-ximenes-soares-portfolio-2-img1/900/600","caption":"Consultation in Liquiçá"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-bayanihan-research-cooperative$$), $$Marawi Returnee Conditions Study$$, $$UNHCR Philippines$$, 2021, 2022, $$Research Firm$$, $$Mixed-methods study of housing, livelihoods and services for families returning to Marawi.$$, $$Study informed priorities of the recovery task force.$$, $$https://picsum.photos/seed/demo-bayanihan-research-cooperative-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-bayanihan-research-cooperative-portfolio-1-img1/900/600","caption":"Community researchers in Marawi"},{"url":"https://picsum.photos/seed/demo-bayanihan-research-cooperative-portfolio-1-img2/900/600","caption":"Validation workshop"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-bayanihan-research-cooperative$$), $$Disability-Inclusive Disaster Risk Reduction Assessment$$, $$CBM$$, 2019, 2019, $$Research Firm$$, $$Assessed inclusion of persons with disabilities in local disaster risk reduction plans in six municipalities.$$, $$Municipalities adopted accessible early-warning measures.$$, $$https://picsum.photos/seed/demo-bayanihan-research-cooperative-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-bayanihan-research-cooperative-portfolio-2-img1/900/600","caption":"Evacuation centre accessibility audit"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-aigerim-toktogulova$$), $$Public Building Retrofit Programme$$, $$UNDP Kyrgyzstan$$, 2017, 2020, $$Project Coordinator$$, $$Coordinated energy efficiency retrofits of 40 schools and clinics and facilitated municipal co-financing.$$, $$Average heating energy use in retrofitted buildings fell by 35%.$$, $$https://picsum.photos/seed/demo-aigerim-toktogulova-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-aigerim-toktogulova-portfolio-1-img1/900/600","caption":"Retrofitted school in Naryn"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-aigerim-toktogulova$$), $$Clean Heating Options for Rural Households$$, $$World Bank$$, 2022, 2023, $$Consultant$$, $$Assessed clean heating alternatives to coal stoves and consulted households and suppliers.$$, $$Findings informed a pilot of efficient stoves and insulation subsidies.$$, $$https://picsum.photos/seed/demo-aigerim-toktogulova-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-aigerim-toktogulova-portfolio-2-img1/900/600","caption":"Household consultation in Issyk-Kul"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-sherzod-yuldashev$$), $$Export Diversification Indicators$$, $$Uzbek government economic think tank$$, 2023, 2024, $$Analyst$$, $$Built export diversification and product complexity indicators from customs data using R.$$, $$Indicators included in the annual export strategy review.$$, $$https://picsum.photos/seed/demo-sherzod-yuldashev-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sherzod-yuldashev-portfolio-1-img1/900/600","caption":"Export indicator dashboard"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-sherzod-yuldashev$$), $$Logistics Performance Along Central Asian Corridors$$, $$Asian Development Bank$$, 2022, 2023, $$Research Assistant$$, $$Compiled border crossing times and freight costs along regional corridors and produced statistical summaries.$$, $$Data used in a regional corridor performance report.$$, $$https://picsum.photos/seed/demo-sherzod-yuldashev-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-sherzod-yuldashev-portfolio-2-img1/900/600","caption":"Border crossing at Oybek"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-mariana-ospina-restrepo$$), $$Safe Routes to School Programme, Bogotá$$, $$Bloomberg Philanthropies Initiative for Global Road Safety$$, 2020, 2022, $$Road Safety Planner$$, $$Mapped crash hotspots near 80 schools with GIS and designed traffic calming with parents and teachers.$$, $$Pedestrian injuries near treated schools fell by a third.$$, $$https://picsum.photos/seed/demo-mariana-ospina-restrepo-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mariana-ospina-restrepo-portfolio-1-img1/900/600","caption":"Traffic calming near a school in Kennedy"},{"url":"https://picsum.photos/seed/demo-mariana-ospina-restrepo-portfolio-1-img2/900/600","caption":"Walking audit with students"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-mariana-ospina-restrepo$$), $$Accessibility Analysis for Quito's Cycling Network$$, $$Inter-American Development Bank$$, 2023, 2023, $$GIS Lead$$, $$Analysed job accessibility by bicycle and public transport to prioritize new cycling corridors.$$, $$Three priority corridors included in the city mobility plan.$$, $$https://picsum.photos/seed/demo-mariana-ospina-restrepo-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mariana-ospina-restrepo-portfolio-2-img1/900/600","caption":"Cycling corridor accessibility map"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-colibri-estudio-visual$$), $$Explainer Animation Series on Women's Economic Rights$$, $$UN Women Americas and the Caribbean$$, 2022, 2023, $$Animation Studio$$, $$Produced six short animations with motion graphics and subtitles in three languages.$$, $$Series viewed more than 2 million times across regional channels.$$, $$https://picsum.photos/seed/demo-colibri-estudio-visual-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-colibri-estudio-visual-portfolio-1-img1/900/600","caption":"Animation storyboard"},{"url":"https://picsum.photos/seed/demo-colibri-estudio-visual-portfolio-1-img2/900/600","caption":"Character design sheet"}]$$::jsonb, $$[{"label":"Showreel","url":"https://example.org/colibri-showreel"}]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-colibri-estudio-visual$$), $$Brand Identity for a Regional Peace Network$$, $$Regional civil-society network$$, 2019, 2019, $$Branding Studio$$, $$Created the brand identity, templates and publication layout for a peacebuilding network.$$, $$Identity used by 40 member organizations.$$, $$https://picsum.photos/seed/demo-colibri-estudio-visual-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-colibri-estudio-visual-portfolio-2-img1/900/600","caption":"Brand guidelines spread"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rosa-quispe-mamani$$), $$Native Potato Biodiversity and Climate Study$$, $$FAO Peru$$, 2021, 2022, $$Field Research Lead$$, $$Led qualitative research with six Quechua communities on native potato varieties, seed exchange and climate change.$$, $$Study supported recognition of a community agrobiodiversity zone.$$, $$https://picsum.photos/seed/demo-rosa-quispe-mamani-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rosa-quispe-mamani-portfolio-1-img1/900/600","caption":"Seed fair in Pisac"},{"url":"https://picsum.photos/seed/demo-rosa-quispe-mamani-portfolio-1-img2/900/600","caption":"Interview with a community seed keeper"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rosa-quispe-mamani$$), $$Prior Consultation Interpretation for an Irrigation Project$$, $$Ministry of Culture, Peru$$, 2019, 2019, $$Quechua Interpreter$$, $$Interpreted community assemblies during a prior consultation process for an irrigation project.$$, $$Agreements recorded in Quechua and Spanish; consultation completed with community consent.$$, $$https://picsum.photos/seed/demo-rosa-quispe-mamani-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rosa-quispe-mamani-portfolio-2-img1/900/600","caption":"Community assembly in Apurímac"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-alvaro-choque-mendoza$$), $$Climate-Resilient Irrigation for Altiplano Communities$$, $$Inter-American Development Bank$$, 2019, 2023, $$Programme Manager$$, $$Managed design and construction of 35 small irrigation and water harvesting systems with community water committees.$$, $$Irrigated area expanded by 4,200 hectares; water user organizations manage all systems.$$, $$https://picsum.photos/seed/demo-alvaro-choque-mendoza-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-alvaro-choque-mendoza-portfolio-1-img1/900/600","caption":"Micro-dam on the Altiplano"},{"url":"https://picsum.photos/seed/demo-alvaro-choque-mendoza-portfolio-1-img2/900/600","caption":"Water committee meeting"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-alvaro-choque-mendoza$$), $$Glacier Retreat Adaptation Plan, Cordillera Real$$, $$Swiss Agency for Development and Cooperation$$, 2016, 2017, $$Lead Engineer$$, $$Prepared an adaptation plan for water supply and irrigation in basins fed by retreating glaciers.$$, $$Plan financed in a second phase covering 12 municipalities.$$, $$https://picsum.photos/seed/demo-alvaro-choque-mendoza-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-alvaro-choque-mendoza-portfolio-2-img1/900/600","caption":"Glacier-fed reservoir"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-beatriz-nogueira-lima$$), $$Impact Evaluation of an Early Childhood Home-Visiting Programme$$, $$Inter-American Development Bank$$, 2019, 2022, $$Principal Investigator$$, $$Randomized impact evaluation of home visits linked to cash transfer families in three Brazilian states.$$, $$Found gains in child development scores; programme scaled to 2,000 municipalities.$$, $$https://picsum.photos/seed/demo-beatriz-nogueira-lima-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-beatriz-nogueira-lima-portfolio-1-img1/900/600","caption":"Home visit in Ceará"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-beatriz-nogueira-lima$$), $$Cash Transfer Design Support, Mozambique$$, $$UNICEF Mozambique$$, 2023, 2024, $$Policy Advisor$$, $$Advised on targeting and benefit design for a child grant using evidence from Brazil and the region.$$, $$Design adopted in the national basic social security strategy.$$, $$https://picsum.photos/seed/demo-beatriz-nogueira-lima-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-beatriz-nogueira-lima-portfolio-2-img1/900/600","caption":"Workshop in Maputo"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rafael-tavares-moura$$), $$Wind Curtailment Analysis, North-East Brazil$$, $$State energy agency (Pernambuco)$$, 2023, 2024, $$Data Analyst$$, $$Analysed curtailment of wind generation using hourly grid data in Python.$$, $$Analysis supported a request for transmission upgrades.$$, $$https://picsum.photos/seed/demo-rafael-tavares-moura-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rafael-tavares-moura-portfolio-1-img1/900/600","caption":"Wind farm in the sertão"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rafael-tavares-moura$$), $$Distributed Solar for Public Schools$$, $$Universidade Federal de Pernambuco$$, 2021, 2022, $$Research Assistant$$, $$Modelled generation and payback for rooftop solar on 200 public schools.$$, $$Model used in the state's solar schools tender.$$, $$https://picsum.photos/seed/demo-rafael-tavares-moura-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rafael-tavares-moura-portfolio-2-img1/900/600","caption":"Rooftop solar installation"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-gabriela-andrade-paredes$$), $$Integration Survey of Venezuelan Refugees and Migrants$$, $$UNHCR Ecuador$$, 2022, 2023, $$Survey Lead$$, $$Designed and analysed a survey of 2,000 households on livelihoods, documentation and access to services.$$, $$Results informed municipal integration plans in Quito and Guayaquil.$$, $$https://picsum.photos/seed/demo-gabriela-andrade-paredes-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-gabriela-andrade-paredes-portfolio-1-img1/900/600","caption":"Survey team in Quito"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-gabriela-andrade-paredes$$), $$Social Cohesion in Border Towns$$, $$Danish Refugee Council$$, 2021, 2021, $$Researcher$$, $$Qualitative research on relations between Venezuelan migrants and host communities in Tulcán and Huaquillas.$$, $$Recommendations used to design community dialogue activities.$$, $$https://picsum.photos/seed/demo-gabriela-andrade-paredes-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-gabriela-andrade-paredes-portfolio-2-img1/900/600","caption":"Focus group in Tulcán"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-andina-consultores-asociados$$), $$Public Investment System Reform Support, Peru$$, $$Inter-American Development Bank$$, 2017, 2020, $$Lead Firm$$, $$Supported redesign of the national public investment system, including procurement and project appraisal processes.$$, $$New system introduced across national and regional governments.$$, $$https://picsum.photos/seed/demo-andina-consultores-asociados-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-andina-consultores-asociados-portfolio-1-img1/900/600","caption":"Training of regional planning officers"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-andina-consultores-asociados$$), $$Regional Roads Programme Management, Bolivia$$, $$CAF Development Bank of Latin America$$, 2021, 2024, $$Programme Management Firm$$, $$Managed preparation and supervision of a regional rural roads programme.$$, $$620 km of roads rehabilitated on schedule.$$, $$https://picsum.photos/seed/demo-andina-consultores-asociados-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-andina-consultores-asociados-portfolio-2-img1/900/600","caption":"Rural road works in Cochabamba"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-widline-pierre-louis$$), $$Hurricane Matthew Shelter and WASH Recovery, Grand'Anse$$, $$European Commission (ECHO)$$, 2017, 2019, $$Project Manager$$, $$Managed reconstruction of 1,800 shelters and community water points with local committees.$$, $$All shelters completed before the next hurricane season.$$, $$https://picsum.photos/seed/demo-widline-pierre-louis-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-widline-pierre-louis-portfolio-1-img1/900/600","caption":"Shelter reconstruction in Jérémie"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-widline-pierre-louis$$), $$Displacement Site Community Committees, Port-au-Prince$$, $$IOM Haiti$$, 2012, 2015, $$Coordinator and Interpreter$$, $$Coordinated committees in displacement sites and interpreted between residents and agencies.$$, $$Committees managed relocations of 6,000 families.$$, $$https://picsum.photos/seed/demo-widline-pierre-louis-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-widline-pierre-louis-portfolio-2-img1/900/600","caption":"Committee meeting in a displacement site"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-yokasta-feliz-matos$$), $$Hurricane Preparedness Social Media Campaign$$, $$Regional climate resilience programme$$, 2023, 2023, $$Social Media Lead$$, $$Ran a preparedness campaign with short videos and copy on emergency kits and evacuation routes.$$, $$Campaign reached 1.2 million accounts in the Dominican Republic and Haiti.$$, $$https://picsum.photos/seed/demo-yokasta-feliz-matos-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-yokasta-feliz-matos-portfolio-1-img1/900/600","caption":"Campaign video still"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-yokasta-feliz-matos$$), $$Coastal Community Outreach Days$$, $$Dominican Red Cross$$, 2021, 2022, $$Outreach Organizer$$, $$Organized outreach days in fishing communities on climate risks and emergency food and water stocks.$$, $$14 outreach days held with 2,500 participants.$$, $$https://picsum.photos/seed/demo-yokasta-feliz-matos-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-yokasta-feliz-matos-portfolio-2-img1/900/600","caption":"Outreach day in Barahona"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-caldera-development-group$$), $$Local Governance and Public Finance Program, Central America$$, $$USAID$$, 2016, 2021, $$Prime Contractor$$, $$Implemented a five-year program strengthening municipal finance, procurement and service delivery in 40 municipalities.$$, $$Own-source revenue in partner municipalities rose by 28% on average.$$, $$https://picsum.photos/seed/demo-caldera-development-group-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-caldera-development-group-portfolio-1-img1/900/600","caption":"Municipal finance training"},{"url":"https://picsum.photos/seed/demo-caldera-development-group-portfolio-1-img2/900/600","caption":"Program launch"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-caldera-development-group$$), $$Trade and Investment Enabling Environment Project, Morocco$$, $$Millennium Challenge Corporation$$, 2019, 2023, $$Implementing Firm$$, $$Supported investment climate reforms and investor services for industrial zones.$$, $$Investment approval times cut by half in pilot regions.$$, $$https://picsum.photos/seed/demo-caldera-development-group-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-caldera-development-group-portfolio-2-img1/900/600","caption":"Investor services centre"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-rebecca-thornton-hale$$), $$Annual Meetings Keynote Speeches$$, $$Multilateral development bank$$, 2010, 2014, $$Lead Speechwriter$$, $$Wrote keynote speeches for annual meetings on jobs, governance and climate.$$, $$Speeches widely covered in international media.$$, $$https://picsum.photos/seed/demo-rebecca-thornton-hale-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rebecca-thornton-hale-portfolio-1-img1/900/600","caption":"Annual meetings plenary"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-rebecca-thornton-hale$$), $$Foundation President's Annual Letters$$, $$Private philanthropic foundation$$, 2018, 2024, $$Ghostwriter$$, $$Ghostwrote the foundation president's annual letters and related op-eds.$$, $$Letters published in major newspapers each year.$$, $$https://picsum.photos/seed/demo-rebecca-thornton-hale-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-rebecca-thornton-hale-portfolio-2-img1/900/600","caption":"Annual letter cover"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-mathieu-gagnon-leblanc$$), $$E-Learning Localization for Community Health Workers$$, $$Global health partnership$$, 2021, 2022, $$Localization Lead$$, $$Localized a 20-module e-learning course into French and Spanish, adapting examples for West and Central Africa and Latin America.$$, $$Course used by 15,000 health workers in 18 countries.$$, $$https://picsum.photos/seed/demo-mathieu-gagnon-leblanc-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mathieu-gagnon-leblanc-portfolio-1-img1/900/600","caption":"Localized course screen"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-mathieu-gagnon-leblanc$$), $$Campaign Transcreation for Girls' Education$$, $$Canadian NGO$$, 2023, 2023, $$Transcreator$$, $$Transcreated campaign slogans, scripts and social content into French and Spanish.$$, $$Campaign launched in five countries with locally adapted messaging.$$, $$https://picsum.photos/seed/demo-mathieu-gagnon-leblanc-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-mathieu-gagnon-leblanc-portfolio-2-img1/900/600","caption":"Campaign poster in French"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-priyanka-desai-mehra$$), $$Commercial and Industrial Solar Portfolio Model$$, $$Climate investment advisory$$, 2023, 2024, $$Financial Analyst$$, $$Built the financial model and emissions estimates for a portfolio of rooftop solar projects in Kenya and India.$$, $$Model supported a blended finance investment decision.$$, $$https://picsum.photos/seed/demo-priyanka-desai-mehra-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-priyanka-desai-mehra-portfolio-1-img1/900/600","caption":"Rooftop solar on a factory"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-priyanka-desai-mehra$$), $$Climate Fund Portfolio Analysis$$, $$Climate investment advisory$$, 2022, 2023, $$Data Analyst$$, $$Analysed mitigation project data across climate fund portfolios to benchmark costs per tonne of CO2.$$, $$Benchmarks used in client investment screening.$$, $$https://picsum.photos/seed/demo-priyanka-desai-mehra-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-priyanka-desai-mehra-portfolio-2-img1/900/600","caption":"Portfolio analysis chart"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-daniel-whitfield-okoro$$), $$Crisis Monitoring Dashboard$$, $$UN humanitarian data team$$, 2023, 2024, $$Developer$$, $$Built a web dashboard combining conflict events, displacement and food prices with a Python data pipeline.$$, $$Used by coordination teams in four crisis countries.$$, $$https://picsum.photos/seed/demo-daniel-whitfield-okoro-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-daniel-whitfield-okoro-portfolio-1-img1/900/600","caption":"Dashboard screenshot"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-daniel-whitfield-okoro$$), $$Fragility Indicator Database$$, $$University research lab on political violence$$, 2021, 2023, $$Research Assistant$$, $$Designed and maintained a database of fragility indicators for 60 countries.$$, $$Database underpinned two published papers.$$, $$https://picsum.photos/seed/demo-daniel-whitfield-okoro-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-daniel-whitfield-okoro-portfolio-2-img1/900/600","caption":"Indicator database schema"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-margaret-ellison-shaw$$), $$Impact Evaluation of a Pan-African Scholarship Programme$$, $$Mastercard Foundation$$, 2018, 2023, $$Evaluation Lead$$, $$Longitudinal impact evaluation of scholars' education, employment and leadership outcomes.$$, $$Evaluation shaped the programme's next ten-year strategy.$$, $$https://picsum.photos/seed/demo-margaret-ellison-shaw-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-margaret-ellison-shaw-portfolio-1-img1/900/600","caption":"Scholar interviews in Accra"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-margaret-ellison-shaw$$), $$Quality Assurance Reform Advice, Tunisia$$, $$World Bank$$, 2016, 2017, $$Tertiary Education Expert$$, $$Advised on accreditation and quality assurance for public universities.$$, $$New accreditation agency established.$$, $$https://picsum.photos/seed/demo-margaret-ellison-shaw-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-margaret-ellison-shaw-portfolio-2-img1/900/600","caption":"Workshop at a Tunis university"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-salma-el-idrissi$$), $$Gender Budget Statement Support, Tunisia$$, $$UN Women$$, 2019, 2021, $$Lead Advisor$$, $$Advised the Ministry of Finance on introducing a gender budget statement and trained budget officers in eight ministries.$$, $$First gender budget statement annexed to the 2021 finance law.$$, $$https://picsum.photos/seed/demo-salma-el-idrissi-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-salma-el-idrissi-portfolio-1-img1/900/600","caption":"Training of budget officers in Tunis"},{"url":"https://picsum.photos/seed/demo-salma-el-idrissi-portfolio-1-img2/900/600","caption":"Validation meeting"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-salma-el-idrissi$$), $$Gender Impact of Tax Reform, Morocco$$, $$OECD$$, 2022, 2022, $$Policy Analyst$$, $$Analysed the gender impact of proposed personal income tax and VAT reforms.$$, $$Analysis informed adjustments to family deductions.$$, $$https://picsum.photos/seed/demo-salma-el-idrissi-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-salma-el-idrissi-portfolio-2-img1/900/600","caption":"Presentation to parliament's finance committee"}]$$::jsonb, $$[]$$::jsonb, 2);

INSERT INTO portfolio_items (profile_id, project_name, organization, start_year, end_year, role, description, results, cover_image, images, links, sort_order) VALUES
  ((SELECT id FROM profiles WHERE handle = $$demo-youssef-ben-amor$$), $$Investment Incentive Cost-Benefit Model, Tunisia$$, $$World Bank$$, 2021, 2022, $$Financial Modeler$$, $$Built a cost-benefit model of investment incentives under the new investment law.$$, $$Government phased out two low-return incentives.$$, $$https://picsum.photos/seed/demo-youssef-ben-amor-portfolio-1/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-youssef-ben-amor-portfolio-1-img1/900/600","caption":"Model review session"}]$$::jsonb, $$[]$$::jsonb, 1),
  ((SELECT id FROM profiles WHERE handle = $$demo-youssef-ben-amor$$), $$Olive Oil Export Competitiveness Study$$, $$GIZ Tunisia$$, 2020, 2020, $$Lead Economist$$, $$Analysed export performance, costs and market access for packaged olive oil.$$, $$Recommendations adopted in the sector export strategy.$$, $$https://picsum.photos/seed/demo-youssef-ben-amor-portfolio-2/600/400$$, $$[{"url":"https://picsum.photos/seed/demo-youssef-ben-amor-portfolio-2-img1/900/600","caption":"Olive oil mill in Sfax"}]$$::jsonb, $$[]$$::jsonb, 2);

COMMIT;
