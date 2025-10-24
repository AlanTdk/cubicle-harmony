-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  career TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cubicles table
CREATE TABLE public.cubicles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the 4 cubicles
INSERT INTO public.cubicles (id, name) VALUES
  (1, 'Cubículo 1'),
  (2, 'Cubículo 2'),
  (3, 'Cubículo 3'),
  (4, 'Cubículo 4');

-- Create rentals table for tracking history
CREATE TABLE public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cubicle_id INTEGER NOT NULL REFERENCES public.cubicles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  hours INTEGER NOT NULL CHECK (hours >= 1 AND hours <= 6),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_rentals_cubicle_id ON public.rentals(cubicle_id);
CREATE INDEX idx_rentals_student_id ON public.rentals(student_id);
CREATE INDEX idx_rentals_active ON public.rentals(is_active);
CREATE INDEX idx_rentals_start_time ON public.rentals(start_time);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cubicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is an administrative app)
CREATE POLICY "Allow public read access on students"
  ON public.students FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on students"
  ON public.students FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update on students"
  ON public.students FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access on cubicles"
  ON public.cubicles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public update on cubicles"
  ON public.cubicles FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access on rentals"
  ON public.rentals FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert on rentals"
  ON public.rentals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update on rentals"
  ON public.rentals FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Function to automatically update cubicle occupation status
CREATE OR REPLACE FUNCTION public.update_cubicle_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    -- Mark cubicle as occupied when new active rental is created
    UPDATE public.cubicles
    SET is_occupied = true
    WHERE id = NEW.cubicle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    -- Mark cubicle as available when rental becomes inactive
    UPDATE public.cubicles
    SET is_occupied = false
    WHERE id = NEW.cubicle_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic cubicle status updates
CREATE TRIGGER rental_status_change
  AFTER INSERT OR UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cubicle_status();

-- Function to calculate end_time based on start_time and hours
CREATE OR REPLACE FUNCTION public.calculate_rental_end_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.end_time := NEW.start_time + (NEW.hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-calculate end_time
CREATE TRIGGER set_rental_end_time
  BEFORE INSERT OR UPDATE ON public.rentals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_rental_end_time();