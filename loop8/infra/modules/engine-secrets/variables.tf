variable "name_prefix" {
  description = "Prefix of the secret names. The apply role can only manage secrets named mavenscout/..., so it must be mavenscout"
  type        = string
}

variable "secret_names" {
  description = "Names of the secrets to create, without the prefix. Each is created empty, the value is added by hand"
  type        = set(string)
}
