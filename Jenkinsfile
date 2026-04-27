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
                git 'https://github.com/Gideon-dwijj/task-manager.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'echo "Building Docker Image..."'
                sh 'docker build -t $APP_NAME .'
            }
        }

        stage('Stop Old Container') {
            steps {
                sh 'echo "Stopping old container if exists..."'
                sh 'docker stop $CONTAINER_NAME || true'
                sh 'docker rm $CONTAINER_NAME || true'
            }
        }

        stage('Run New Container') {
            steps {
                sh 'echo "Starting new container..."'
                sh 'docker run -d -p 3000:3000 --name $CONTAINER_NAME $APP_NAME'
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