-- Retain legacy handles when unrelated account data changes.
CREATE FUNCTION woc_validate_username() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.nickname = OLD.nickname AND NEW."normalizedNickname" = OLD."normalizedNickname" THEN
      RETURN NEW;
    END IF;
  END IF;
  IF NEW.nickname !~ '^[a-z]{3,24}$' OR NEW.nickname <> NEW."normalizedNickname" THEN
    RAISE EXCEPTION 'Invalid username' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER woc_username_policy BEFORE INSERT OR UPDATE OF nickname, "normalizedNickname"
ON "User" FOR EACH ROW EXECUTE FUNCTION woc_validate_username();
