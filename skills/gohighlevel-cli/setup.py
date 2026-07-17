from setuptools import setup, find_namespace_packages

setup(
    name="cli-anything",
    version="1.1.0",
    description="CLI interfaces for GoHighLevel, Nextcloud, and Blotato APIs",
    author="Lead Gen Jay",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    package_data={
        "cli_anything.gohighlevel": ["skills/*.md"],
        "cli_anything.nextcloud": ["skills/*.md"],
    },
    install_requires=[
        "click>=8.0.0",
        "prompt-toolkit>=3.0.0",
        "requests>=2.28.0",
        "rich>=13.0.0",
    ],
    entry_points={
        "console_scripts": [
            "cli-anything-gohighlevel=cli_anything.gohighlevel.gohighlevel_cli:main",
            "ghl=cli_anything.gohighlevel.gohighlevel_cli:main",
            "nc=cli_anything.nextcloud.nextcloud_cli:main",
            "blotato=cli_anything.blotato.blotato_cli:main",
        ],
    },
    python_requires=">=3.10",
)
