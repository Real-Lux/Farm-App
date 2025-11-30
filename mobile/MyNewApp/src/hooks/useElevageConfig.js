import database from '../services/database';

export function useElevageConfig(animalType) {
  const getElevageConfig = () => {
    return database.getElevageConfig(animalType);
  };

  const getDefaultSpecies = () => {
    const config = getElevageConfig();
    return config.defaultSpecies || 'poussins';
  };

  const getAvailableSpecies = () => {
    const config = getElevageConfig();
    return config.species || ['poussins'];
  };

  const getRaceTypes = () => {
    const config = getElevageConfig();
    return config.raceTypes || ['poules'];
  };

  return {
    getElevageConfig,
    getDefaultSpecies,
    getAvailableSpecies,
    getRaceTypes
  };
}

