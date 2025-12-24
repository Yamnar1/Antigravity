const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pilot = sequelize.define('Pilot', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    id_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    license_number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    license_type: {
        type: DataTypes.ENUM('Alumno Piloto', 'Piloto Privado', 'Piloto Comercial', 'ATP'),
        allowNull: false
    },
    license_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    },
    medical_cert: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    medical_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Habilitaciones por Tipo de Aeronave (8) - con Función
    aircraft_rating_1: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_1_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_1_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_2: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_2_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_2_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_3: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_3_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_3_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_4: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_4_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_4_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_5: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_5_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_5_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_6: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_6_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_6_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_7: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_7_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_7_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_8: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_8_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_8_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    // Otras Habilitaciones (7) - con Observación
    ifr_rating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ifr_rating_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ifr_rating_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    language_proficiency: {
        type: DataTypes.STRING,
        allowNull: true
    },
    language_proficiency_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    language_proficiency_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    night_rating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    night_rating_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    night_rating_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    multi_engine_rating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    multi_engine_rating_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    multi_engine_rating_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    formation_rating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    formation_rating_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    formation_rating_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    instructor_rating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instructor_rating_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    instructor_rating_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    other_rating: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    // Habilitaciones adicionales de aeronave (9, 10)
    aircraft_rating_9: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_9_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_9_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    aircraft_rating_10: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_10_function: {
        type: DataTypes.STRING,
        allowNull: true
    },
    aircraft_rating_10_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    // Otras habilitaciones adicionales (8, 9, 10)
    other_rating_2: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_2_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_2_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    other_rating_3: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_3_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_3_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    other_rating_4: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_4_obs: {
        type: DataTypes.STRING,
        allowNull: true
    },
    other_rating_4_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: 'pilots'
});

module.exports = Pilot;
