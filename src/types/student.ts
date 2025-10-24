export interface Student {
  id: string;
  name: string;
  controlNumber: string;
  career: string;
}

export interface Cubicle {
  id: number;
  isOccupied: boolean;
  student?: Student;
  hours?: number;
  startTime?: Date;
}
