pipeline {
    agent any

    environment {
        APP_NAME = "task-app"
        CONTAINER_NAME = "task-container"
    }

    stages {

        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('Clone Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/Gideon-dwijj/task-manager.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Docker Image..."
                sh 'docker build -t $APP_NAME .'
            }
        }

        stage('Stop Old Container') {
            steps {
                echo "Stopping old container if exists..."
                sh 'docker stop $CONTAINER_NAME || true'
                sh 'docker rm $CONTAINER_NAME || true'
            }
        }

        stage('Run New Container') {
            steps {
                echo "Starting new container..."
                sh 'docker run -d --restart=always -p 3000:3000 --name $CONTAINER_NAME $APP_NAME'
            }
        }
    }

    post {
        success {
            echo '✅ Deployment successful!'
        }
        failure {
            echo '❌ Deployment failed!'
        }
    }
}