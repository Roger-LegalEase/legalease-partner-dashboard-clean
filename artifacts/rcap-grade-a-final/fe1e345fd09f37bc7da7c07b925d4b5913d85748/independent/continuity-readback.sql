SET default_transaction_read_only=on;
SELECT session_id,jurisdiction,flow_mode,partner_slug,partner_benefit_active,status,(SELECT count(*) FROM jsonb_object_keys(answers)) AS answer_count,current_question_id,updated_at FROM public.screening_sessions WHERE session_id='a1c23ed1-d4ff-4350-b416-abaf1e76f8d2';
SELECT count(*) AS participant_matters FROM public.consumer_briefcase_items WHERE source_session_id='a1c23ed1-d4ff-4350-b416-abaf1e76f8d2';
