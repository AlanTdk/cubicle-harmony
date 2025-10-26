-- Fix search_path security warning by dropping trigger first, then function
DROP TRIGGER IF EXISTS set_rental_end_time ON public.rentals;
DROP FUNCTION IF EXISTS public.calculate_rental_end_time();

-- Recreate function with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_rental_end_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.end_time := NEW.start_time + (NEW.hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER set_rental_end_time
  BEFORE INSERT OR UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_rental_end_time();