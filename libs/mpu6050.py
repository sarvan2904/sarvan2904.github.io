import struct
import time

class MPU6050:
    def __init__(self, i2c, addr=104):
        self.i2c = i2c
        self.addr = addr
        self.init_device()
        self.reset_gyro()

    def init_device(self):
        self.i2c.writeto_mem(104, 107, struct.pack('<b', 0))

    def reset_gyro(self):
        self.gyro_x = 0
        self.gyro_y = 0
        self.gyro_z = 0
        self.prev_x = 0
        self.prev_y = 0
        self.prev_z = 0
        self.prev_time = time.ticks_us()

    def calibrateGyro(self, reps=40, threshold=100):
        prev_x, prev_y, prev_z = struct.unpack('>hhh', self.i2c.readfrom_mem(104, 67, 6))
        sum_x, sum_y, sum_z = 0, 0, 0
        while True:
            time.sleep_ms(50)
            x, y, z =  struct.unpack('>hhh', self.i2c.readfrom_mem(104, 67, 6))
            if abs(x - prev_x) > threshold or abs(y - prev_y) > threshold or abs(z - prev_z) > threshold:
                continue
            prev_x, prev_y, prev_z = x, y, z
            sum_x += x
            sum_y += y
            sum_z += z
            reps -= 1
            if reps == 0:
                break
        self.error_x = sum_x / reps
        self.error_y = sum_y / reps
        self.error_z = sum_z / reps

    def accel_all(self):
        all = struct.unpack('>hhh', self.i2c.readfrom_mem(104, 59, 6))[0]
        return (all[0]/16.384, all[1]/16.384, all[2]/16.384)

    def accel_x(self):
        return struct.unpack('>h', self.i2c.readfrom_mem(104, 59, 2))[0] / 16.384

    def accel_y(self):
        return struct.unpack('>h', self.i2c.readfrom_mem(104, 61, 2))[0] / 16.384

    def accel_z(self):
        return struct.unpack('>h', self.i2c.readfrom_mem(104, 63, 2))[0] / 16.384

    def temp(self):
        return struct.unpack('>h', self.i2c.readfrom_mem(104, 65, 2))[0] / 340 + 36.53

    def rate_all(self):
        all = struct.unpack('>hhh', self.i2c.readfrom_mem(104, 67, 6))[0]
        return (all[0]/131, all[1]/ 131, all[2]/131)

    def rate_x(self):
        return (struct.unpack('>h', self.i2c.readfrom_mem(104, 67, 2))[0] - self.error_x) / 131

    def rate_y(self):
        return (struct.unpack('>h', self.i2c.readfrom_mem(104, 69, 2))[0] - self.error_y) / 131

    def rate_z(self):
        return (struct.unpack('>h', self.i2c.readfrom_mem(104, 71, 2))[0] - self.error_z) / 131

    def angle_x(self):
        return self.gyro_x

    def angle_y(self):
        return self.gyro_y

    def angle_z(self):
        return self.gyro_z

    def update_angle(self):
        x, y, z =  struct.unpack('>hhh', self.i2c.readfrom_mem(104, 67, 6))
        x -= self.error_x
        y -= self.error_y
        z -= self.error_z
        now = time.ticks_us()
        delta = now - self.prev_time
        self.gyro_x = (x + self.prev_x)  / 262000000 * delta
        self.gyro_y = (x + self.prev_y)  / 262000000 * delta
        self.gyro_z = (x + self.prev_z)  / 262000000 * delta
        self.prev_x = x
        self.prev_y = y
        self.prev_z = z
        self.prev_time = now
