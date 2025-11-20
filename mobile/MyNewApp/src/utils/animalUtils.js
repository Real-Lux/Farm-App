/**
 * Utility functions for animal-related calculations
 */

export const getAnimalAge = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  const diffTime = Math.abs(today - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = diffDays % 30;
  
  if (years > 0) {
    return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
  } else if (months > 0) {
    return `${months} mois ${days} jour${days > 1 ? 's' : ''}`;
  } else {
    return `${days} jour${days > 1 ? 's' : ''}`;
  }
};

export const getAnimalAgeForGenealogy = (birthDate) => {
  const birth = new Date(birthDate);
  const today = new Date();
  const diffTime = Math.abs(today - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  
  if (years > 0) {
    return `${years}a ${months}m`;
  } else if (months > 0) {
    return `${months}m`;
  } else {
    return '0m';
  }
};

export const getTotalMilkProduction = (animal) => {
  if (!animal.milkProduction || animal.milkProduction.length === 0) return 0;
  return animal.milkProduction.reduce((total, day) => total + day.total, 0);
};

export const getAverageMilkProduction = (animal) => {
  if (!animal.milkProduction || animal.milkProduction.length === 0) return 0;
  const total = getTotalMilkProduction(animal);
  return (total / animal.milkProduction.length).toFixed(1);
};

export const getBabyMales = (animals) => {
  return animals.filter(animal => {
    if (animal.gender !== 'mâle') return false;
    const birthDate = new Date(animal.birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths < 7; // Baby males are less than 7 months old
  });
};

export const getBabyFemales = (animals) => {
  return animals.filter(animal => {
    if (animal.gender !== 'femelle') return false;
    const birthDate = new Date(animal.birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths < 7; // Baby females are less than 7 months old
  });
};

export const getGrownMales = (animals) => {
  return animals.filter(animal => {
    if (animal.gender !== 'mâle') return false;
    const birthDate = new Date(animal.birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birthDate);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths >= 7; // Grown males are 7+ months old
  });
};

export const getDeceasedAnimals = (animals) => {
  return animals.filter(animal => animal.exitCause === 'décès');
};

