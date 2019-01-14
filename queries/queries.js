exports.select_safe_zones_by_location = "SELECT * FROM shelters WHERE areas = ? AND approved = 1;";

exports.insert_red_alert_for_user = "INSERT INTO red_alert_for_users VALUES (?,?,?,?);";

exports.update_arrival_to_safe_zone = "UPDATE red_alert_for_users SET arrived = 1 WHERE unique_id = ? AND red_alert_id = ?;";

exports.insert_shelter = "INSERT INTO shelters (areas, user_id, latitude, longitude, address) VALUES (?,?,?,?,?);";

exports.update_approved_shelter = "UPDATE shelters (approved) SET approved = 1 WHERE id = ?;";

exports.delete_shelter = "DELETE FROM shelters WHERE id = ?;";

exports.update_pointes_declined_for_user = "UPDATE users SET points_declined = points_declined + 1 WHERE email = ?;";

exports.update_pointes_approved_for_user = "UPDATE users SET points_approved = points_approved + 1 WHERE email = ?;";

exports.insert_user = "INSERT INTO users (email, admin) VALUES (?,?);";

exports.insert_user_with_points = "INSERT INTO users (email, admin, points_approved, points_collected, points_declined) VALUES (?,?,?,?,?);";

exports.insert_device = "INSERT INTO devices (unique_id, latitude, longitude, area_code) VALUES (?, ?, ?, ?);";

exports.update_device = "UPDATE devices SET latitude = ?, longitude = ?, area_code= ? WHERE unique_id = ?;";

exports.insert_areas = "INSERT INTO areas (area_code, city) VALUES (?, ?);";

exports.insert_red_alert_notification = "INSERT INTO red_alert (time, area_code) VALUES (?, ?);";

exports.select_devices_by_area_code = "SELECT * FROM devices WHERE area_code = ?;";

exports.select_user_by_email = "SELECT * FROM users WHERE email = ?;";
