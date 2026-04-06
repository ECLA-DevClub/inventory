from enum import Enum


class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    TECHNICIAN = "technician"
    VIEWER = "viewer"

