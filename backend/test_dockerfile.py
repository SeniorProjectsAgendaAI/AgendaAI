# Ankush Joshi 
# test_dockerfile.py - tests for the dockerfile to ensure it is built correctly

'''
in order, this file tests for: 
- confirming image exists after build setup
- verifies that the working directory is correctly set to /app
- checks that port 8080 is corectly exposed 
- runs to image and confirms that the cmd is correctly set to run uvicorn
- ensrues that all essential libraries were installed during the build 
- ensures that build time dependencies are not present in the runtime image.

to run, use the command:
pytest test_dockerfile.py -v
'''

import subprocess
import pytest

IMAGE_NAME = "agendaai-backend-test"

def _docker(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["docker", *args],
        capture_output=True,
        text=True,
        check=check,
    )

@pytest.fixture(scope="module")
def docker_image():
    result = _docker("build", "-t", IMAGE_NAME, ".", check=False)
    if result.returncode != 0:
        pytest.fail(f"Docker build failed:\n{result.stderr}")
    yield IMAGE_NAME
    _docker("rmi", "-f", IMAGE_NAME, check=False)

class TestImages:

    def test_image_build(self, docker_image):
        result = _docker("inspect", docker_image)
        assert result.returncode == 0

    def test_workdir(self, docker_image):
        result = _docker("inspect", "-f", "{{.Config.WorkingDir}}", docker_image)
        assert result.stdout.strip() == "/app"

    def test_port_8080_exposed(self, docker_image):
        result = _docker("inspect", "-f", "{{json .Config.ExposedPorts}}", docker_image)
        assert "8080" in result.stdout

    def test_uvicorn_cmds(self, docker_image):
        result = _docker("inspect", "-f", "{{json .Config.Cmd}}", docker_image)
        assert "uvicorn" in result.stdout
        assert "8080" in result.stdout

    def test_app_code_present(self, docker_image):
        result = _docker(
            "run", "--rm", docker_image,
            "python3", "-c", "import app; print('ok')",
        )
        assert result.stdout.strip() == "ok"

    def test_packages_installed(self, docker_image):
        check_script = (
            "import fastapi, uvicorn, psycopg, passlib, cryptography; "
            "print('all_imports_ok')"
        )
        result = _docker(
            "run", "--rm", docker_image,
            "python3", "-c", check_script,
        )
        assert result.stdout.strip() == "all_imports_ok"

    def test_no_build_tools(self, docker_image):
        result = _docker(
            "run", "--rm", docker_image,
            "which", "gcc",
            check=False,
        )
        assert result.returncode != 0
