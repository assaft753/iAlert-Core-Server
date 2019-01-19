//------- Shelters -------//

exports.select_all_shelters = "SELECT * FROM shelters";

exports.select_shelters_by_location = "SELECT * FROM shelters WHERE area_code = ? AND approved = 1;";

exports.insert_shelter = "INSERT INTO shelters (area_code, user_id, latitude, longitude, address) VALUES (?,?,?,?,?);";

exports.update_approved_shelter = "UPDATE shelters SET approved = 1 WHERE id = ?;";

exports.delete_shelter = "DELETE FROM shelters WHERE id = ?;";


//------- Red alert for devices -------//

exports.insert_red_alert_for_user = "INSERT INTO devices_red_alert (red_alert_id, shelter_id, arrived, device_id) VALUES (?,?,?,?);";

exports.update_arrival_to_safe_zone = "UPDATE devices_red_alert SET arrived = 1 WHERE device_id = ? AND red_alert_id = ?;";


//------- Users -------//

exports.update_pointes_declined_for_user = "UPDATE users SET points_declined = points_declined + 1 WHERE email = ?;";
exports.update_pointes_approved_for_user = "UPDATE users SET points_approved = points_approved + 1 WHERE email = ?;";

exports.insert_user = "INSERT INTO users (email, admin) VALUES (?,?);";

exports.insert_user_with_points = "INSERT INTO users (email, admin, points_approved, points_collected, points_declined) VALUES (?,?,?,?,?);";

exports.select_user_by_email = "SELECT * FROM users WHERE email = ?;";


//------- Devices -------//

exports.register_device = "INSERT INTO devices (unique_id) VALUES (?);";

//exports.insert_device = "INSERT INTO devices (unique_id, latitude, longitude, area_code) VALUES (?, ?, ?, ?);";

exports.update_device_id = "UPDATE devices SET unique_id = ? WHERE unique_id = ?;";

exports.select_device = "SELECT * FROM devices WHERE unique_id = ?;";

exports.update_device = "UPDATE devices SET latitude = ?, longitude = ?, area_code = ?, disable = 0 WHERE unique_id = ?;";

exports.select_devices_by_area_code = "SELECT * FROM devices WHERE area_code = ? AND disable = 0;";

exports.select_lat_lon_by_unique_id = "SELECT latitude,longitude FROM devices WHERE unique_id = ?;";


//------- Areas -------//

exports.insert_areas = "INSERT INTO areas (area_code, city) VALUES (?, ?);";

exports.select_area_code_by_city_name = "SELECT area_code FROM areas WHERE city = ?;";

exports.select_area_id_by_city_name = "SELECT id FROM areas WHERE city = ?;";

exports.select_area_id_by_area_code = "SELECT id FROM areas WHERE area_code = ?;";


//------- Red alert -------//

exports.insert_red_alert_notification = "INSERT INTO red_alert (time, area_code) VALUES (?, ?);";
