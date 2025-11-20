import database from '../services/database';

export function useHerdConfig(herdType) {
  const getHerdConfig = () => {
    return database.getHerdConfig(herdType);
  };

  const getDefaultSpecies = () => {
    const config = getHerdConfig();
    return config.defaultSpecies || 'animal';
  };

  const getAvailableSpecies = () => {
    const config = getHerdConfig();
    return config.species || ['animal'];
  };

  return {
    getHerdConfig,
    getDefaultSpecies,
    getAvailableSpecies
  };
}

