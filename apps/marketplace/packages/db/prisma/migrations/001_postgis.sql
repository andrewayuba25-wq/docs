-- PostGIS support for ArtisanProfile location queries.
-- Run AFTER `prisma migrate deploy` so the table exists.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "ArtisanProfile"
  ADD COLUMN IF NOT EXISTS geo geography(Point, 4326);

CREATE INDEX IF NOT EXISTS artisan_geo_idx
  ON "ArtisanProfile" USING GIST (geo);

-- Keep geo in sync with currentLat/currentLng so the API can write floats
-- and rely on PostGIS for distance queries.
CREATE OR REPLACE FUNCTION artisan_geo_sync() RETURNS trigger AS $$
BEGIN
  IF NEW."currentLat" IS NOT NULL AND NEW."currentLng" IS NOT NULL THEN
    NEW.geo := ST_SetSRID(ST_MakePoint(NEW."currentLng", NEW."currentLat"), 4326)::geography;
  ELSE
    NEW.geo := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS artisan_geo_sync_trg ON "ArtisanProfile";
CREATE TRIGGER artisan_geo_sync_trg
  BEFORE INSERT OR UPDATE OF "currentLat", "currentLng"
  ON "ArtisanProfile"
  FOR EACH ROW EXECUTE FUNCTION artisan_geo_sync();
